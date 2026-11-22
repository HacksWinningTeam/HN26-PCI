import json
import urllib.error
import xml.etree.ElementTree as ET

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPCIAdmin
from apps.discovery.models import ScoringConfig
from apps.innovations.assessment import assess_innovation
from apps.innovations.models import Innovation, InnovationSource

from .locking import IngestionBusyError
from .models import IngestionRun, InnovationAuditLog, SourceFeed
from .pipeline import (
    _unique_slug,
    find_potential_duplicate,
    run_ingestion_pipeline,
    scrape_url_and_ingest,
)
from .serializers import (
    AdminDataQualityResponseSerializer,
    AdminInnovationCreateResponseSerializer,
    AdminInnovationCreateSerializer,
    AdminInnovationItemSerializer,
    AdminInnovationPatchSerializer,
    AdminInnovationRejectSerializer,
    AdminRunIngestionRequestSerializer,
    AdminScoringConfigResponseSerializer,
    AdminScrapeUrlRequestSerializer,
    AdminScrapeUrlResponseSerializer,
    IngestionRunSerializer,
    InnovationAuditLogSerializer,
    MergeDuplicateRequestSerializer,
    MergeDuplicateResponseSerializer,
    ScoringConfigPatchSerializer,
    ScoringConfigSerializer,
    SourceFeedCreateSerializer,
    SourceFeedPatchSerializer,
    SourceFeedSerializer,
)


def _resolve_actor(request) -> str:
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False) and user.email:
        return user.email
    return "pci_admin"


class AdminDataQualityView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: AdminDataQualityResponseSerializer},
        summary="PCI Admin data quality overview (pending, conflicts, duplicates, errors, stale)",
    )
    def get(self, request):
        active = list(Innovation.objects.filter(is_merged=False).select_related("duplicate_of"))
        pending_review = [
            i for i in active if i.verification_status in {"pending_review", "conflict"}
        ]
        conflicts_or_missing = [i for i in active if (i.conflicting_info or i.missing_info)]
        potential_duplicates = [i for i in active if i.duplicate_of is not None]
        stale_records = [i for i in active if i.verification_status == "stale"]
        incomplete_records = [i for i in active if i.is_incomplete or bool(i.missing_info)]

        runs = IngestionRun.objects.all()[:10]

        return Response(
            {
                "pending_review": AdminInnovationItemSerializer(pending_review, many=True).data,
                "conflicts_or_missing": AdminInnovationItemSerializer(
                    conflicts_or_missing, many=True
                ).data,
                "potential_duplicates": AdminInnovationItemSerializer(
                    potential_duplicates, many=True
                ).data,
                "stale_records": AdminInnovationItemSerializer(stale_records, many=True).data,
                "incomplete_records": AdminInnovationItemSerializer(
                    incomplete_records, many=True
                ).data,
                "all_records": AdminInnovationItemSerializer(active, many=True).data,
                "source_feeds": SourceFeedSerializer(
                    SourceFeed.objects.with_local_counts(), many=True
                ).data,
                "ingestion_runs": IngestionRunSerializer(runs, many=True).data,
            }
        )

    @extend_schema(
        tags=["Admin"],
        request=AdminInnovationCreateSerializer,
        responses={201: AdminInnovationCreateResponseSerializer},
        summary="Manually import a verified innovation record with duplicate check",
    )
    def post(self, request):
        serializer = AdminInnovationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        today = timezone.localdate()

        dup_target, similarity_pct = find_potential_duplicate(
            data["title_pl"],
            data["organization_name"],
        )
        linked_dup = None if data.get("ignore_duplicate") else dup_target

        inv = Innovation.objects.create(
            slug=_unique_slug(data["title_pl"]),
            title_pl=data["title_pl"],
            title_en=data.get("title_en") or data["title_pl"],
            short_summary_pl=data["short_summary_pl"],
            short_summary_en=data.get("short_summary_en") or data["short_summary_pl"],
            problem_pl=data["problem_pl"],
            problem_en=data.get("problem_en") or data["problem_pl"],
            solution_pl=data["solution_pl"],
            solution_en=data.get("solution_en") or data["solution_pl"],
            primary_area=data["primary_area"],
            innovation_character=data.get("innovation_character") or ["product"],
            sectors=data.get("sectors") or [],
            beneficiary_groups=data.get("beneficiary_groups") or [],
            target_org_types=data.get("target_org_types") or [],
            tags=data.get("tags") or [],
            organization_name=data["organization_name"],
            organization_type=data["organization_type"],
            origin_location=data["origin_location"],
            deployment_level=data["deployment_level"],
            trl=data.get("trl"),
            patent_status=data.get("patent_status", "none"),
            oslo_compliant=data.get("oslo_compliant", True),
            verification_status=data.get("verification_status", "verified"),
            verification_method=data.get("verification_method")
            or "Ręczny import zweryfikowanego rekordu przez operatora PCI",
            is_public=data.get("is_public", True),
            is_synthetic_demo=False,
            classification_provenance={"primary_area": "source", "sectors": "source"},
            contact_info=data.get("contact_info") or {},
            fetched_at=today,
            last_verified_at=today,
            duplicate_of=linked_dup,
        )

        if data.get("source_url"):
            label = data.get("source_label") or data["title_pl"][:120]
            snapshot = f"[{data['source_registry']}] {label} — {data['short_summary_pl']}"
            InnovationSource.objects.create(
                innovation=inv,
                label=label,
                registry=data.get("source_registry") or "Import ręczny PCI",
                url=data["source_url"],
                fetched_at=today,
                last_verified_at=today,
                is_available=True,
                raw_snapshot=snapshot,
                content_hash=InnovationSource.compute_hash(snapshot),
            )

        assess_innovation(inv)
        InnovationAuditLog.objects.create(
            innovation=inv,
            action="verify" if inv.verification_status == "verified" else "ingest",
            actor=_resolve_actor(request),
            verification_method=inv.verification_method,
            changes={"slug": {"old": None, "new": inv.slug}},
            note="Ręczny import rekordu przez administratora PCI.",
        )

        return Response(
            {
                "innovation": AdminInnovationItemSerializer(inv).data,
                "potential_duplicate_slug": dup_target.slug if dup_target else "",
                "similarity_pct": similarity_pct,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminInnovationUpdateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        request=AdminInnovationPatchSerializer,
        responses={200: AdminInnovationItemSerializer},
        summary="Edit innovation fields or update verification status",
    )
    def patch(self, request, slug: str):
        innovation = Innovation.objects.filter(slug=slug, is_merged=False).first()
        if not innovation:
            return Response({"detail": "Nie znaleziono rekordu."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminInnovationPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        changes: dict[str, dict[str, object]] = {}
        for field, value in serializer.validated_data.items():
            old_val = getattr(innovation, field)
            if old_val != value:
                changes[field] = {"old": old_val, "new": value}
            setattr(innovation, field, value)
        if serializer.validated_data.get("verification_status") == "verified":
            innovation.last_verified_at = timezone.localdate()
            if not innovation.verification_method:
                innovation.verification_method = "Zweryfikowano ręcznie przez administratora PCI"
        innovation.save()
        assess_innovation(innovation)

        if changes:
            action = (
                "verify"
                if serializer.validated_data.get("verification_status") == "verified"
                else "edit"
            )
            InnovationAuditLog.objects.create(
                innovation=innovation,
                action=action,
                actor=_resolve_actor(request),
                verification_method=innovation.verification_method,
                changes=changes,
            )

        return Response(AdminInnovationItemSerializer(innovation).data)


class AdminInnovationRejectView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        request=AdminInnovationRejectSerializer,
        responses={200: AdminInnovationItemSerializer},
        summary="Reject an innovation record and hide it from the public catalog",
    )
    def post(self, request, slug: str):
        innovation = Innovation.objects.filter(slug=slug, is_merged=False).first()
        if not innovation:
            return Response({"detail": "Nie znaleziono rekordu."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminInnovationRejectSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "").strip()

        old_public = innovation.is_public
        innovation.is_public = False
        innovation.verification_method = (
            f"Odrzucono przez operatora PCI: {reason}"
            if reason
            else "Odrzucono przez operatora PCI"
        )
        innovation.save(update_fields=["is_public", "verification_method", "updated_at"])

        InnovationAuditLog.objects.create(
            innovation=innovation,
            action="reject",
            actor=_resolve_actor(request),
            verification_method=innovation.verification_method,
            changes={"is_public": {"old": old_public, "new": False}},
            note=reason or "Rekord ukryty z katalogu publicznego.",
        )
        return Response(AdminInnovationItemSerializer(innovation).data)


class AdminInnovationHistoryView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: InnovationAuditLogSerializer(many=True)},
        summary="List verification and edit audit history for an innovation",
    )
    def get(self, request, slug: str):
        innovation = Innovation.objects.filter(slug=slug).first()
        if not innovation:
            return Response({"detail": "Nie znaleziono rekordu."}, status=status.HTTP_404_NOT_FOUND)
        logs = innovation.audit_logs.all()
        return Response(InnovationAuditLogSerializer(logs, many=True).data)


class AdminMergeDuplicateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        request=MergeDuplicateRequestSerializer,
        responses={200: MergeDuplicateResponseSerializer},
        summary="Merge a duplicate innovation into its primary or specified target record",
    )
    def post(self, request, slug: str):
        dup = (
            Innovation.objects.filter(slug=slug, is_merged=False)
            .select_related("duplicate_of")
            .first()
        )
        if not dup:
            return Response({"detail": "Nie znaleziono rekordu."}, status=status.HTTP_404_NOT_FOUND)

        serializer = MergeDuplicateRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        target_slug = serializer.validated_data.get("target_slug", "").strip()

        if target_slug:
            target = (
                Innovation.objects.filter(slug=target_slug, is_merged=False)
                .exclude(pk=dup.pk)
                .first()
            )
            if not target:
                return Response(
                    {"detail": "Nie znaleziono docelowego rekordu do scalenia."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif dup.duplicate_of and not dup.duplicate_of.is_merged:
            target = dup.duplicate_of
        else:
            return Response(
                {"detail": "Rekord nie jest oznaczony jako duplikat ani nie podano target_slug."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for src in dup.sources.all():
            src.innovation = target
            src.save(update_fields=["innovation"])
        # Generated explanations belong to old inputs, not the merged evidence set.
        dup.evidences.exclude(assessment_key="").delete()
        for ev in dup.evidences.all():
            ev.innovation = target
            ev.save(update_fields=["innovation"])
        dup.duplicate_of = target
        dup.is_merged = True
        dup.save(update_fields=["duplicate_of", "is_merged"])
        assess_innovation(target)

        actor = _resolve_actor(request)
        InnovationAuditLog.objects.create(
            innovation=target,
            action="merge",
            actor=actor,
            verification_method=target.verification_method,
            changes={"merged_duplicate_slug": {"old": None, "new": dup.slug}},
            note=f"Scalono duplikat {dup.slug} do {target.slug}.",
        )
        InnovationAuditLog.objects.create(
            innovation=dup,
            action="merge",
            actor=actor,
            changes={"is_merged": {"old": False, "new": True}},
            note=f"Rekord scalony z rekordem głównym {target.slug}.",
        )

        return Response({"merged_slug": dup.slug, "target_slug": target.slug})


class AdminRunIngestionView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        request=AdminRunIngestionRequestSerializer,
        responses={201: IngestionRunSerializer, 409: OpenApiTypes.OBJECT},
        summary="Trigger a source refresh, normalization, and deduplication run",
    )
    def post(self, request):
        serializer = AdminRunIngestionRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            run = run_ingestion_pipeline(
                feed_ids=data.get("feed_ids") or None,
                max_records=int(data.get("max_records", 10)),
                actor=_resolve_actor(request),
            )
        except IngestionBusyError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(IngestionRunSerializer(run).data, status=status.HTTP_201_CREATED)


class AdminScrapeUrlView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        request=AdminScrapeUrlRequestSerializer,
        responses={201: AdminScrapeUrlResponseSerializer, 409: OpenApiTypes.OBJECT},
        summary="Scrape public HTML, JSON/RSS/OAI-PMH, or PDF URL as pending_review",
    )
    def post(self, request):
        serializer = AdminScrapeUrlRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            ingested = scrape_url_and_ingest(
                url=data["url"],
                registry=data.get("registry", ""),
                label=data.get("label", ""),
                organization_name=data.get("organization_name", ""),
                method=data.get("method", "auto"),
                max_records=int(data.get("max_records", 3)),
                actor=_resolve_actor(request),
            )
        except IngestionBusyError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except (urllib.error.URLError, TimeoutError) as exc:
            return Response(
                {"detail": f"Błąd pobierania ze źródła zewnętrznego: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except (ValueError, json.JSONDecodeError, ET.ParseError) as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        counts = {
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "duplicate": 0,
            "conflict": 0,
        }
        results_payload = []
        for inv, outcome in ingested:
            if outcome in counts:
                counts[outcome] += 1
            results_payload.append(
                {
                    "innovation": AdminInnovationItemSerializer(inv).data,
                    "outcome": outcome,
                    "potential_duplicate_slug": inv.duplicate_of.slug if inv.duplicate_of else "",
                }
            )

        return Response(
            {
                "url": data["url"],
                "scraped_count": len(results_payload),
                "created_count": counts["created"],
                "updated_count": counts["updated"],
                "unchanged_count": counts["unchanged"],
                "duplicate_count": counts["duplicate"],
                "conflict_count": counts["conflict"],
                "results": results_payload,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminSourceFeedListCreateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: SourceFeedSerializer(many=True)},
        summary="List all configured public ingestion SourceFeeds",
    )
    def get(self, request):
        feeds = SourceFeed.objects.with_local_counts()
        return Response(SourceFeedSerializer(feeds, many=True).data)

    @extend_schema(
        tags=["Admin"],
        request=SourceFeedCreateSerializer,
        responses={201: SourceFeedSerializer},
        summary="Create a new configurable public SourceFeed",
    )
    def post(self, request):
        serializer = SourceFeedCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        data.setdefault("last_synced_at", timezone.now())
        feed = SourceFeed.objects.create(**data)
        return Response(SourceFeedSerializer(feed).data, status=status.HTTP_201_CREATED)


class AdminSourceFeedDetailView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: SourceFeedSerializer},
        summary="Retrieve a single SourceFeed configuration",
    )
    def get(self, request, pk: int):
        feed = SourceFeed.objects.filter(pk=pk).first()
        if not feed:
            return Response({"detail": "Nie znaleziono źródła."}, status=status.HTTP_404_NOT_FOUND)
        return Response(SourceFeedSerializer(feed).data)

    @extend_schema(
        tags=["Admin"],
        request=SourceFeedPatchSerializer,
        responses={200: SourceFeedSerializer},
        summary="Update a SourceFeed URL, adapter method, status, or config",
    )
    def patch(self, request, pk: int):
        feed = SourceFeed.objects.filter(pk=pk).first()
        if not feed:
            return Response({"detail": "Nie znaleziono źródła."}, status=status.HTTP_404_NOT_FOUND)
        serializer = SourceFeedPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(feed, field, value)
        feed.save()
        return Response(SourceFeedSerializer(feed).data)

    @extend_schema(
        tags=["Admin"],
        responses={204: None},
        summary="Delete a custom SourceFeed",
    )
    def delete(self, request, pk: int):
        feed = SourceFeed.objects.filter(pk=pk).first()
        if not feed:
            return Response({"detail": "Nie znaleziono źródła."}, status=status.HTTP_404_NOT_FOUND)
        feed.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminScoringConfigView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsPCIAdmin]

    @extend_schema(
        tags=["Admin"],
        responses={200: AdminScoringConfigResponseSerializer},
        summary="Retrieve active scoring weights, classification rules, and version history",
    )
    def get(self, request):
        active = ScoringConfig.get_active()
        versions = ScoringConfig.objects.all()[:10]
        return Response(
            {
                "active": ScoringConfigSerializer(active).data,
                "versions": ScoringConfigSerializer(versions, many=True).data,
            }
        )

    @extend_schema(
        tags=["Admin"],
        request=ScoringConfigPatchSerializer,
        responses={200: AdminScoringConfigResponseSerializer},
        summary="Update or create a versioned scoring & classification configuration",
    )
    def patch(self, request):
        active = ScoringConfig.get_active()
        serializer = ScoringConfigPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        new_version = data.get("version")
        if new_version and new_version != active.version:
            cfg = ScoringConfig(
                version=new_version,
                is_active=True,
                problem_weight=data.get("problem_weight", active.problem_weight),
                sector_weight=data.get("sector_weight", active.sector_weight),
                beneficiary_weight=data.get("beneficiary_weight", active.beneficiary_weight),
                organization_fit_weight=data.get(
                    "organization_fit_weight", active.organization_fit_weight
                ),
                min_score_threshold=data.get(
                    "min_score_threshold", active.min_score_threshold
                ),
                low_confidence_threshold=data.get(
                    "low_confidence_threshold", active.low_confidence_threshold
                ),
                classification_rules=data.get(
                    "classification_rules", active.classification_rules
                ),
            )
        else:
            cfg = active
            for field in (
                "problem_weight",
                "sector_weight",
                "beneficiary_weight",
                "organization_fit_weight",
                "min_score_threshold",
                "low_confidence_threshold",
                "classification_rules",
            ):
                if field in data:
                    setattr(cfg, field, data[field])

        try:
            cfg.save()
        except DjangoValidationError as exc:
            return Response(
                {"detail": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        versions = ScoringConfig.objects.all()[:10]
        return Response(
            {
                "active": ScoringConfigSerializer(cfg).data,
                "versions": ScoringConfigSerializer(versions, many=True).data,
            }
        )
