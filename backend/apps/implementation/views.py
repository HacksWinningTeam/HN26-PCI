import os
import re

from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AdopterProfile
from apps.accounts.permissions import IsPCIAdmin
from apps.accounts.serializers import AdopterProfileSerializer
from apps.innovations.models import Innovation

from .exports import render_plan_csv, render_plan_markdown
from .models import ImplementationPlan, ImplementationStep
from .planner import (
    build_five_phases,
    build_missing_blockers,
    build_personalized_metrics,
    find_similar_innovations,
    personalize_phases_with_gemini,
    select_plan_variant,
    select_recommendation_path,
)
from .radar import build_attachment_url, build_impact_radar_payload, serialize_transfer_row
from .serializers import (
    AdminImpactRadarSerializer,
    AdminImpactTransferSerializer,
    AdminImplementationOverviewSerializer,
    AdminTransferVerifySerializer,
    ImplementationAttachmentUploadSerializer,
    ImplementationPlanCreateSerializer,
    ImplementationPlanSerializer,
    ImplementationPlanUpdateSerializer,
    ImplementationStepSerializer,
    ImplementationStepUpdateSerializer,
)

MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".md",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
}


class ImplementationPlanListCreateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Implementation"],
        responses={200: ImplementationPlanSerializer(many=True)},
        summary="List current user's implementation plans",
    )
    def get(self, request):
        plans = (
            ImplementationPlan.objects.filter(user=request.user)
            .select_related("innovation")
            .prefetch_related("steps", "innovation__sources", "innovation__evidences")
        )
        return Response(ImplementationPlanSerializer(plans, many=True).data)

    @extend_schema(
        tags=["Implementation"],
        request=ImplementationPlanCreateSerializer,
        responses={201: ImplementationPlanSerializer},
        summary="Generate a maturity-aware five-phase implementation plan",
    )
    def post(self, request):
        serializer = ImplementationPlanCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slug = serializer.validated_data["innovation_slug"]
        comparison_slugs = serializer.validated_data.get("comparison_slugs", [])

        innovation = Innovation.objects.filter(
            slug=slug, is_merged=False, is_public=True
        ).first()
        if not innovation:
            return Response(
                {"detail": "Nie znaleziono wskazanej innowacji."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile, _ = AdopterProfile.objects.get_or_create(user=request.user)
        variant, rationale = select_plan_variant(innovation)
        rec_path, rec_rationale = select_recommendation_path(innovation, profile, variant)
        base_phases = build_five_phases(
            innovation, profile, variant, recommendation_path=rec_path
        )
        phases, ai_personalized = personalize_phases_with_gemini(
            base_phases, innovation, profile, variant, rec_path
        )

        plan = ImplementationPlan.objects.create(
            user=request.user,
            innovation=innovation,
            variant=variant,
            variant_rationale=rationale,
            recommendation_path=rec_path,
            recommendation_rationale=rec_rationale,
            organization_snapshot=AdopterProfileSerializer(profile).data,
            comparison_slugs=comparison_slugs or [slug],
            requirements=innovation.required_resources or [],
            risks=innovation.risks or [],
            success_metrics=build_personalized_metrics(innovation, profile, variant),
            missing_info_blockers=build_missing_blockers(innovation, profile),
            similar_innovations=find_similar_innovations(innovation),
            partner_archetypes=innovation.partner_archetypes or [],
            ai_personalized=ai_personalized,
        )

        for phase in phases:
            ImplementationStep.objects.create(plan=plan, **phase)

        plan.refresh_from_db()
        return Response(
            ImplementationPlanSerializer(plan).data,
            status=status.HTTP_201_CREATED,
        )


class ImplementationPlanDetailView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Implementation"],
        responses={200: ImplementationPlanSerializer},
        summary="Retrieve single implementation plan",
    )
    def get(self, request, pk: int):
        plan = (
            ImplementationPlan.objects.filter(pk=pk, user=request.user)
            .select_related("innovation")
            .prefetch_related("steps", "innovation__sources", "innovation__evidences")
            .first()
        )
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ImplementationPlanSerializer(plan).data)

    @extend_schema(
        tags=["Implementation"],
        request=ImplementationPlanUpdateSerializer,
        responses={200: ImplementationPlanSerializer},
        summary="Update plan notes, reported issues, or deployment/outcome report",
    )
    def patch(self, request, pk: int):
        plan = (
            ImplementationPlan.objects.filter(pk=pk, user=request.user)
            .select_related("innovation")
            .prefetch_related("steps", "innovation__sources", "innovation__evidences")
            .first()
        )
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ImplementationPlanUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        updated_fields: list[str] = []
        if "user_reported_issues" in data:
            plan.user_reported_issues = data["user_reported_issues"]
            updated_fields.append("user_reported_issues")

        report_fields = (
            "adopter_deployment_status",
            "deployment_started_on",
            "reached_beneficiaries_count",
            "metric_before",
            "metric_after",
            "outcome_summary",
            "outcome_visibility",
            "evidence_url",
        )
        report_changed = False
        for field in report_fields:
            if field in data:
                setattr(plan, field, data[field])
                updated_fields.append(field)
                report_changed = True

        if report_changed:
            now = timezone.now()
            plan.deployment_reported_at = now
            updated_fields.append("deployment_reported_at")
            if (
                plan.adopter_deployment_status in {"in_pilot", "deployed"}
                and plan.pilot_started_at is None
            ):
                plan.pilot_started_at = now
                updated_fields.append("pilot_started_at")
            if plan.pci_transfer_status == "needs_clarification":
                plan.pci_transfer_status = "unverified"
                updated_fields.append("pci_transfer_status")

        if updated_fields:
            updated_fields.append("updated_at")
            plan.save(update_fields=list(dict.fromkeys(updated_fields)))
        return Response(ImplementationPlanSerializer(plan).data)


class ImplementationStepUpdateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Implementation"],
        request=ImplementationStepUpdateSerializer,
        responses={200: ImplementationStepSerializer},
        summary="Update implementation step status or notes",
    )
    def patch(self, request, pk: int):
        step = (
            ImplementationStep.objects.select_related("plan")
            .filter(pk=pk, plan__user=request.user)
            .first()
        )
        if not step:
            return Response(
                {"detail": "Nie znaleziono kroku planu."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = ImplementationStepUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "status" in serializer.validated_data:
            step.status = serializer.validated_data["status"]
        if "notes" in serializer.validated_data:
            step.notes = serializer.validated_data["notes"]
        step.save()
        if (
            step.phase_number >= 3
            and step.status in {"in_progress", "completed"}
            and step.plan.pilot_started_at is None
        ):
            step.plan.pilot_started_at = timezone.now()
            step.plan.save(update_fields=["pilot_started_at", "updated_at"])
        return Response(ImplementationStepSerializer(step).data)


class ImplementationPlanAttachmentView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["Implementation"],
        responses={(200, "application/octet-stream"): OpenApiTypes.BINARY},
        summary="Download implementation results attachment (owner or PCI Admin)",
    )
    def get(self, request, pk: int):
        plan = ImplementationPlan.objects.filter(pk=pk).first()
        if not plan or not plan.outcome_attachment_data or not plan.outcome_attachment_name:
            return Response(
                {"detail": "Nie znaleziono załącznika."},
                status=status.HTTP_404_NOT_FOUND,
            )
        is_owner = plan.user_id == request.user.id
        is_admin = IsPCIAdmin().has_permission(request, self)
        if not is_owner and not is_admin:
            return Response({"detail": "Brak dostępu."}, status=status.HTTP_403_FORBIDDEN)

        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", plan.outcome_attachment_name).strip("._")
        if not safe_name:
            safe_name = f"rezultaty-plan-{pk}"
        resp = HttpResponse(
            bytes(plan.outcome_attachment_data),
            content_type=plan.outcome_attachment_content_type or "application/octet-stream",
        )
        resp["Content-Disposition"] = f'attachment; filename="{safe_name}"'
        return resp

    @extend_schema(
        tags=["Implementation"],
        request={"multipart/form-data": ImplementationAttachmentUploadSerializer},
        responses={200: ImplementationPlanSerializer},
        summary="Upload real deployment results attachment for a completed implementation",
    )
    def post(self, request, pk: int):
        plan = (
            ImplementationPlan.objects.filter(pk=pk, user=request.user)
            .select_related("innovation")
            .prefetch_related("steps", "innovation__sources", "innovation__evidences")
            .first()
        )
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ImplementationAttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded = serializer.validated_data["file"]

        filename = os.path.basename(getattr(uploaded, "name", "") or "rezultaty")
        _, ext = os.path.splitext(filename.lower())
        if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
            return Response(
                {
                    "detail": (
                        "Nieobsługiwany format pliku. Dozwolone: PDF, DOC/DOCX, XLS/XLSX, "
                        "CSV, TXT, MD, PNG, JPG, WEBP."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded.size > MAX_ATTACHMENT_BYTES:
            return Response(
                {"detail": "Maksymalny rozmiar załącznika to 10 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_bytes = uploaded.read()
        now = timezone.now()
        plan.outcome_attachment_name = filename[:255]
        plan.outcome_attachment_content_type = (
            getattr(uploaded, "content_type", "") or "application/octet-stream"
        )[:120]
        plan.outcome_attachment_size = len(raw_bytes)
        plan.outcome_attachment_data = raw_bytes
        plan.outcome_attachment_uploaded_at = now
        plan.deployment_reported_at = now
        if plan.pilot_started_at is None:
            plan.pilot_started_at = now
        if plan.pci_transfer_status == "needs_clarification":
            plan.pci_transfer_status = "unverified"
        plan.save()

        return Response(ImplementationPlanSerializer(plan).data)

    @extend_schema(
        tags=["Implementation"],
        responses={200: ImplementationPlanSerializer},
        summary="Delete deployment results attachment",
    )
    def delete(self, request, pk: int):
        plan = (
            ImplementationPlan.objects.filter(pk=pk, user=request.user)
            .select_related("innovation")
            .prefetch_related("steps", "innovation__sources", "innovation__evidences")
            .first()
        )
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)

        plan.outcome_attachment_name = ""
        plan.outcome_attachment_content_type = ""
        plan.outcome_attachment_size = None
        plan.outcome_attachment_data = None
        plan.outcome_attachment_uploaded_at = None
        plan.save(
            update_fields=[
                "outcome_attachment_name",
                "outcome_attachment_content_type",
                "outcome_attachment_size",
                "outcome_attachment_data",
                "outcome_attachment_uploaded_at",
                "updated_at",
            ]
        )
        return Response(ImplementationPlanSerializer(plan).data)


class AdminImplementationOverviewView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: AdminImplementationOverviewSerializer(many=True)},
        summary="PCI Admin overview of all adopter plans, comparisons, and progress",
    )
    def get(self, request):
        plans = (
            ImplementationPlan.objects.select_related("user", "innovation")
            .prefetch_related("steps")
            .all()
        )
        rows = []
        for plan in plans:
            steps = list(plan.steps.all())
            completed = [s for s in steps if s.status == "completed"]
            in_prog = [s for s in steps if s.status == "in_progress"]
            current_phase = in_prog[0].phase_number if in_prog else min(5, len(completed) + 1)
            snap = plan.organization_snapshot or {}
            rows.append(
                {
                    "plan_id": plan.id,
                    "user_email": plan.user.email,
                    "user_name": plan.user.get_full_name() or plan.user.username,
                    "organization_name": snap.get("organization_name") or "Niepodana",
                    "organization_type": snap.get("organization_type") or "",
                    "deployment_location": snap.get("deployment_location") or "",
                    "source_organization_name": plan.innovation.organization_name,
                    "innovation_slug": plan.innovation.slug,
                    "innovation_title": plan.innovation.title_pl,
                    "comparison_slugs": plan.comparison_slugs or [],
                    "variant": plan.variant,
                    "recommendation_path": plan.recommendation_path,
                    "current_phase": current_phase,
                    "completed_steps_count": len(completed),
                    "total_steps_count": len(steps),
                    "completed_titles": [s.title for s in completed],
                    "user_reported_issues": plan.user_reported_issues,
                    "step_notes": [
                        f"Faza {s.phase_number}: {s.notes}" for s in steps if s.notes.strip()
                    ],
                    "adopter_deployment_status": plan.adopter_deployment_status,
                    "pci_transfer_status": plan.pci_transfer_status,
                    "reached_beneficiaries_count": plan.reached_beneficiaries_count,
                    "metric_before": plan.metric_before,
                    "metric_after": plan.metric_after,
                    "outcome_summary": plan.outcome_summary,
                    "outcome_attachment_name": plan.outcome_attachment_name,
                    "outcome_attachment_url": build_attachment_url(plan),
                    "updated_at": plan.updated_at,
                }
            )
        return Response(rows)


class AdminImpactRadarView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: AdminImpactRadarSerializer},
        summary="PCI Impact Radar funnel KPIs and live transfer pipeline",
    )
    def get(self, request):
        payload = build_impact_radar_payload()
        return Response(AdminImpactRadarSerializer(payload).data)


class AdminTransferVerifyView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        request=AdminTransferVerifySerializer,
        responses={200: AdminImpactTransferSerializer},
        summary="Confirm deployment, verify measured effect, or request clarification",
    )
    def post(self, request, pk: int):
        plan = (
            ImplementationPlan.objects.select_related("user", "innovation")
            .prefetch_related("steps")
            .filter(pk=pk)
            .first()
        )
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminTransferVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_status = serializer.validated_data["pci_transfer_status"]
        note = serializer.validated_data.get("pci_transfer_note", "").strip()

        if target_status == "needs_clarification" and not note:
            return Response(
                {"detail": "Podaj uwagę dla organizacji, co wymaga uzupełnienia."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_status == "effect_verified" and not (
            plan.outcome_summary.strip()
            or plan.reached_beneficiaries_count is not None
            or note
        ):
            return Response(
                {
                    "detail": (
                        "Weryfikacja efektu wymaga opisu rezultatów lub liczby odbiorców "
                        "od organizacji albo notatki weryfikacyjnej PCI."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        if (
            target_status in {"deployment_confirmed", "effect_verified"}
            and plan.pilot_started_at is None
        ):
            plan.pilot_started_at = now
        plan.pci_transfer_status = target_status
        plan.pci_transfer_note = note
        plan.pci_transfer_verified_at = now
        plan.pci_transfer_verified_by = request.user
        plan.save()

        return Response(AdminImpactTransferSerializer(serialize_transfer_row(plan)).data)


class ImplementationPlanExportView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Implementation"],
        summary="Export personalized implementation plan (json, md, csv)",
        parameters=[
            OpenApiParameter(
                "export_format",
                str,
                enum=["json", "md", "csv"],
                default="md",
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request, pk: int):
        plan = (
            ImplementationPlan.objects.filter(pk=pk, user=request.user)
            .select_related("innovation")
            .prefetch_related("steps", "innovation__sources", "innovation__evidences")
            .first()
        )
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)

        fmt = (request.query_params.get("export_format") or "md").strip().lower()
        if fmt == "json":
            return Response(ImplementationPlanSerializer(plan).data)
        if fmt == "csv":
            resp = HttpResponse(
                render_plan_csv(plan),
                content_type="text/csv; charset=utf-8",
            )
            resp["Content-Disposition"] = f'attachment; filename="plan-{pk}.csv"'
            return resp
        resp = HttpResponse(
            render_plan_markdown(plan),
            content_type="text/markdown; charset=utf-8",
        )
        resp["Content-Disposition"] = f'attachment; filename="plan-{pk}.md"'
        return resp
