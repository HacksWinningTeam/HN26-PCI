from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.innovations.models import Innovation
from apps.innovations.serializers import InnovationSummarySerializer

from .comparison import (
    build_comparison_payload,
    render_comparison_csv,
    render_comparison_markdown,
)
from .matching import evaluate_query_sufficiency, score_innovation_for_query
from .models import (
    InnovationMatch,
    MatchNotification,
    ProblemQuery,
    SavedComparison,
    SavedInnovation,
    ScoringConfig,
)
from .serializers import (
    ComparisonExportRequestSerializer,
    DiscoveryCompareRequestSerializer,
    DiscoveryCompareResponseSerializer,
    DiscoveryMatchRequestSerializer,
    DiscoveryMatchResponseSerializer,
    MatchNotificationCreateSerializer,
    MatchNotificationSerializer,
    SavedComparisonCreateSerializer,
    SavedComparisonSerializer,
    SavedInnovationCreateSerializer,
    SavedInnovationSerializer,
)


class DiscoveryMatchView(APIView):
    """Rank innovations against a user's problem using 40/20/20/20 scoring."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Discovery"],
        request=DiscoveryMatchRequestSerializer,
        responses={200: DiscoveryMatchResponseSerializer},
        summary="Match problem description to existing innovations (40/20/20/20)",
    )
    def post(self, request):
        serializer = DiscoveryMatchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        guidance = evaluate_query_sufficiency(
            problem_text=data["problem_text"],
            sector=data["sector"],
            beneficiary_groups=data["beneficiary_groups"],
            organization_type=data["organization_type"],
            deployment_location=data["deployment_location"],
        )

        query_obj = None
        if data["problem_text"].strip():
            query_obj = ProblemQuery.objects.create(
                user=request.user if request.user.is_authenticated else None,
                problem_text=data["problem_text"],
                sector=data["sector"],
                beneficiary_groups=data["beneficiary_groups"],
                organization_type=data["organization_type"],
                deployment_location=data["deployment_location"],
                problem_scale=data["problem_scale"],
                preferred_maturity=data["preferred_maturity"],
            )

        config = ScoringConfig.get_active()
        weights = (
            config.problem_weight,
            config.sector_weight,
            config.beneficiary_weight,
            config.organization_fit_weight,
        )

        candidates = Innovation.objects.filter(is_merged=False, is_public=True)
        scored: list[dict] = []
        filtered_by_maturity = 0
        for inv in candidates:
            m = score_innovation_for_query(
                inv,
                problem_text=data["problem_text"],
                sector=data["sector"],
                beneficiary_groups=data["beneficiary_groups"],
                organization_type=data["organization_type"],
                preferred_maturity=data["preferred_maturity"],
                weights=weights,
            )
            if not m["meets_maturity"]:
                if m["overall_score"] >= config.min_score_threshold:
                    filtered_by_maturity += 1
                continue
            if m["overall_score"] >= config.min_score_threshold:
                scored.append({"innovation": inv, **m})

        scored.sort(key=lambda x: x["overall_score"], reverse=True)

        if query_obj is not None and scored:
            InnovationMatch.objects.bulk_create(
                [
                    InnovationMatch(
                        query=query_obj,
                        innovation=item["innovation"],
                        problem_score=item["problem_score"],
                        sector_score=item["sector_score"],
                        beneficiary_score=item["beneficiary_score"],
                        organization_fit_score=item["organization_fit_score"],
                        overall_score=item["overall_score"],
                        primary_reason=item["primary_reason"][:255],
                        reasons=item["reasons"],
                        scoring_version=config.version,
                    )
                    for item in scored
                ]
            )

        low_confidence = (
            len(scored) == 0 or scored[0]["overall_score"] < config.low_confidence_threshold
        )
        low_confidence_reason = ""
        if len(scored) == 0 and filtered_by_maturity > 0:
            low_confidence_reason = (
                "Znaleziono pasujące rozwiązania, ale nie spełniają one wybranego "
                "minimalnego poziomu dojrzałości. Poluzuj preferowany poziom dojrzałości."
            )
        elif len(scored) == 0:
            low_confidence_reason = (
                "Żadna z innowacji w bazie nie osiągnęła minimalnego progu "
                "zgodności z opisem i filtrami."
            )
        elif low_confidence:
            low_confidence_reason = (
                f"Najlepsze dopasowanie jest poniżej {config.low_confidence_threshold}% — "
                "warto doprecyzować opis problemu lub zmienić wybrane filtry."
            )

        payload = {
            "sufficient": guidance["sufficient"],
            "completeness_percent": guidance["completeness_percent"],
            "missing_fields": guidance["missing_fields"],
            "suggested_fields": guidance["suggested_fields"],
            "guidance_message": guidance["message"],
            "low_confidence": low_confidence,
            "low_confidence_reason": low_confidence_reason,
            "scoring_version": config.version,
            "results": [
                {
                    "innovation": InnovationSummarySerializer(item["innovation"]).data,
                    "problem_score": item["problem_score"],
                    "sector_score": item["sector_score"],
                    "beneficiary_score": item["beneficiary_score"],
                    "organization_fit_score": item["organization_fit_score"],
                    "overall_score": item["overall_score"],
                    "primary_reason": item["primary_reason"],
                    "reasons": item["reasons"],
                }
                for item in scored
            ],
        }
        return Response(payload, status=status.HTTP_200_OK)


class MatchNotificationCreateView(APIView):
    """Save an email alert when current matches are missing or weak."""

    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Discovery"],
        request=MatchNotificationCreateSerializer,
        responses={201: MatchNotificationSerializer},
        summary="Register email notification for future matching innovations",
    )
    def post(self, request):
        serializer = MatchNotificationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if request.user.is_authenticated and request.user.email:
            email = request.user.email
        else:
            email = (data.get("email") or "").strip()
            if not email:
                return Response(
                    {"detail": "Podaj adres e-mail do powiadomienia."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        alert = MatchNotification.objects.create(
            user=request.user if request.user.is_authenticated else None,
            email=email,
            problem_text=data.get("problem_text", ""),
            filters_snapshot=data.get("filters_snapshot", {}),
        )
        return Response(
            MatchNotificationSerializer(alert).data,
            status=status.HTTP_201_CREATED,
        )


class SavedComparisonListCreateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Discovery"],
        responses={200: SavedComparisonSerializer(many=True)},
        summary="List saved comparisons for current user",
    )
    def get(self, request):
        items = SavedComparison.objects.filter(user=request.user)
        return Response(SavedComparisonSerializer(items, many=True).data)

    @extend_schema(
        tags=["Discovery"],
        request=SavedComparisonCreateSerializer,
        responses={201: SavedComparisonSerializer},
        summary="Save a 2–3 innovation comparison to account",
    )
    def post(self, request):
        serializer = SavedComparisonCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        comp = SavedComparison.objects.create(
            user=request.user,
            title=data["title"],
            innovation_slugs=data["innovation_slugs"],
            query_context=data.get("query_context", {}),
        )
        return Response(
            SavedComparisonSerializer(comp).data,
            status=status.HTTP_201_CREATED,
        )


class SavedInnovationListCreateView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Discovery"],
        responses={200: SavedInnovationSerializer(many=True)},
        summary="List saved innovations for current user",
    )
    def get(self, request):
        items = SavedInnovation.objects.filter(user=request.user).select_related("innovation")
        return Response(SavedInnovationSerializer(items, many=True).data)

    @extend_schema(
        tags=["Discovery"],
        request=SavedInnovationCreateSerializer,
        responses={201: SavedInnovationSerializer},
        summary="Save an innovation to current user's workspace",
    )
    def post(self, request):
        serializer = SavedInnovationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slug = serializer.validated_data["innovation_slug"]
        innovation = Innovation.objects.filter(slug=slug, is_merged=False).first()
        if not innovation:
            return Response(
                {"detail": "Nie znaleziono innowacji."}, status=status.HTTP_404_NOT_FOUND
            )
        saved, _ = SavedInnovation.objects.get_or_create(
            user=request.user,
            innovation=innovation,
        )
        return Response(SavedInnovationSerializer(saved).data, status=status.HTTP_201_CREATED)


class SavedInnovationDetailView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Discovery"],
        responses={204: None},
        summary="Remove a saved innovation from current user's workspace",
    )
    def delete(self, request, slug: str):
        saved = SavedInnovation.objects.filter(
            user=request.user,
            innovation__slug=slug,
        ).first()
        if not saved:
            return Response(
                {"detail": "Nie znaleziono zapisanej innowacji."},
                status=status.HTTP_404_NOT_FOUND,
            )
        saved.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _resolve_comparison_innovations(slugs: list[str]) -> list[Innovation]:
    unique_slugs = list(dict.fromkeys(slugs))
    found = {
        inv.slug: inv
        for inv in Innovation.objects.filter(
            slug__in=unique_slugs, is_merged=False, is_public=True
        ).prefetch_related("sources", "evidences__source")
    }
    return [found[s] for s in unique_slugs if s in found]


class DiscoveryCompareView(APIView):
    """Compare 2–3 innovations side-by-side with differences, leaders, and evidence quality."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Discovery"],
        request=DiscoveryCompareRequestSerializer,
        responses={200: DiscoveryCompareResponseSerializer},
        summary="Compare 2–3 innovations side by side",
    )
    def post(self, request):
        serializer = DiscoveryCompareRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        innovations = _resolve_comparison_innovations(data["innovation_slugs"])
        if len(innovations) < 2:
            return Response(
                {"detail": "Wybierz co najmniej 2 dostępne innowacje do porównania."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = build_comparison_payload(
            innovations,
            problem_text=data.get("problem_text", ""),
            sector=data.get("sector", ""),
            beneficiary_groups=data.get("beneficiary_groups", []),
            organization_type=data.get("organization_type", ""),
        )
        return Response(payload)


class ComparisonExportView(APIView):
    """Export a 2–3 innovation comparison in JSON, Markdown, or CSV."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Discovery"],
        request=ComparisonExportRequestSerializer,
        responses={200: OpenApiTypes.OBJECT},
        summary="Export side-by-side comparison (json, md, csv)",
    )
    def post(self, request):
        serializer = ComparisonExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        innovations = _resolve_comparison_innovations(data["innovation_slugs"])
        if len(innovations) < 2:
            return Response(
                {"detail": "Wybierz co najmniej 2 dostępne innowacje do eksportu."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = build_comparison_payload(
            innovations,
            problem_text=data.get("problem_text", ""),
            sector=data.get("sector", ""),
            beneficiary_groups=data.get("beneficiary_groups", []),
            organization_type=data.get("organization_type", ""),
        )
        fmt = data.get("export_format", "md")
        if fmt == "json":
            return Response(payload)
        if fmt == "csv":
            resp = HttpResponse(
                render_comparison_csv(payload),
                content_type="text/csv; charset=utf-8",
            )
            resp["Content-Disposition"] = 'attachment; filename="comparison.csv"'
            return resp
        resp = HttpResponse(
            render_comparison_markdown(payload),
            content_type="text/markdown; charset=utf-8",
        )
        resp["Content-Disposition"] = 'attachment; filename="comparison.md"'
        return resp
