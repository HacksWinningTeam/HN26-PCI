from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
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
from .serializers import (
    AdminImplementationOverviewSerializer,
    ImplementationPlanCreateSerializer,
    ImplementationPlanSerializer,
    ImplementationPlanUpdateSerializer,
    ImplementationStepSerializer,
    ImplementationStepUpdateSerializer,
)


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
        summary="Update plan notes / reported issues",
    )
    def patch(self, request, pk: int):
        plan = ImplementationPlan.objects.filter(pk=pk, user=request.user).first()
        if not plan:
            return Response({"detail": "Nie znaleziono planu."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ImplementationPlanUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "user_reported_issues" in serializer.validated_data:
            plan.user_reported_issues = serializer.validated_data["user_reported_issues"]
            plan.save(update_fields=["user_reported_issues", "updated_at"])
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
        step = ImplementationStep.objects.filter(pk=pk, plan__user=request.user).first()
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
        return Response(ImplementationStepSerializer(step).data)


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
                    "updated_at": plan.updated_at,
                }
            )
        return Response(rows)


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
