from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .exports import (
    build_innovation_export_dict,
    render_innovation_csv,
    render_innovation_markdown,
)
from .models import Innovation
from .serializers import (
    InnovationDetailSerializer,
    InnovationRegisteredDetailSerializer,
    InnovationSummarySerializer,
)

DEPLOYMENT_ORDER = {
    "concept": 1,
    "prototype": 2,
    "tests": 3,
    "pilot": 4,
    "deployed": 5,
}


def _csv_param(raw: str) -> list[str]:
    return [part.strip() for part in (raw or "").split(",") if part.strip()]


class InnovationListView(ListAPIView):
    """Public catalog search, filtering, and sorting endpoint."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = InnovationSummarySerializer

    @extend_schema(
        tags=["Innovations"],
        summary="List and filter public innovations",
        parameters=[
            OpenApiParameter(
                "q", str, description="Full-text search across title, summary, problem, org, tags"
            ),
            OpenApiParameter("primary_area", str, description="Comma-separated areas (OR)"),
            OpenApiParameter("character", str, description="Comma-separated characters (OR)"),
            OpenApiParameter("sector", str, description="Comma-separated sectors (OR)"),
            OpenApiParameter("beneficiary", str, description="Comma-separated beneficiaries (OR)"),
            OpenApiParameter("origin_location", str),
            OpenApiParameter(
                "deployment_level", str, description="Comma-separated levels (OR)"
            ),
            OpenApiParameter("trl_min", int),
            OpenApiParameter(
                "organization_type", str, description="Comma-separated org types (OR)"
            ),
            OpenApiParameter("verified_only", bool),
            OpenApiParameter("has_verified_sources", bool),
            OpenApiParameter("sort", str, description="deployment_level | name | updated_at"),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = Innovation.objects.filter(is_merged=False, is_public=True).prefetch_related("sources")
        params = self.request.query_params

        q = params.get("q", "").strip().lower()
        primary_areas = _csv_param(params.get("primary_area", ""))
        characters = _csv_param(params.get("character", ""))
        sectors = _csv_param(params.get("sector", ""))
        beneficiaries = _csv_param(params.get("beneficiary", ""))
        origin_location = params.get("origin_location", "").strip().lower()
        deployment_levels = _csv_param(params.get("deployment_level", ""))
        trl_min = params.get("trl_min", "").strip()
        org_types = _csv_param(params.get("organization_type", ""))
        verified_only = params.get("verified_only", "").lower() in {"1", "true", "yes"}
        has_verified_sources = params.get("has_verified_sources", "").lower() in {
            "1",
            "true",
            "yes",
        }
        sort = params.get("sort", "updated_at").strip()

        if primary_areas:
            qs = qs.filter(primary_area__in=primary_areas)
        if deployment_levels:
            qs = qs.filter(deployment_level__in=deployment_levels)
        if org_types:
            qs = qs.filter(organization_type__in=org_types)
        if origin_location:
            qs = qs.filter(origin_location__icontains=origin_location)
        if verified_only:
            qs = qs.filter(verification_status="verified")
        if trl_min.isdigit():
            qs = qs.filter(trl__gte=int(trl_min))

        items = list(qs)

        if characters:
            char_set = set(characters)
            items = [i for i in items if char_set & set(i.innovation_character or [])]
        if sectors:
            sector_set = set(sectors)
            items = [i for i in items if sector_set & set(i.sectors or [])]
        if beneficiaries:
            ben_set = set(beneficiaries)
            items = [i for i in items if ben_set & set(i.beneficiary_groups or [])]
        if has_verified_sources:
            items = [i for i in items if any(s.is_available for s in i.sources.all())]
        if q:
            items = [
                i
                for i in items
                if q
                in (
                    f"{i.title_pl} {i.title_en} {i.short_summary_pl} {i.short_summary_en} "
                    f"{i.problem_pl} {i.problem_en} {i.solution_pl} {i.solution_en} "
                    f"{i.organization_name} {' '.join(i.tags or [])}"
                ).lower()
            ]

        if sort == "name":
            items.sort(key=lambda x: x.title_pl.lower())
        elif sort == "deployment_level":
            items.sort(
                key=lambda x: DEPLOYMENT_ORDER.get(x.deployment_level, 0),
                reverse=True,
            )
        else:
            items.sort(key=lambda x: x.last_verified_at, reverse=True)

        return items


class InnovationDetailView(RetrieveAPIView):
    """Public level-2 innovation detail without private contact info."""

    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = InnovationDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Innovation.objects.filter(is_merged=False, is_public=True).prefetch_related(
            "sources", "evidences__source"
        )

    @extend_schema(tags=["Innovations"], summary="Retrieve public level-2 innovation detail")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class InnovationRegisteredDetailView(RetrieveAPIView):
    """Registered level-3 innovation detail including contact_info."""

    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = InnovationRegisteredDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Innovation.objects.filter(is_merged=False, is_public=True).prefetch_related(
            "sources", "evidences__source"
        )

    @extend_schema(
        tags=["Innovations"],
        summary="Retrieve registered level-3 detail with contact details",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class InnovationExportView(APIView):
    """Export public innovation card as JSON, Markdown, or CSV."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Innovations"],
        summary="Export public innovation card (json, md, csv)",
        parameters=[
            OpenApiParameter(
                "export_format",
                str,
                enum=["json", "md", "csv"],
                default="json",
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request, slug: str):
        innovation = (
            Innovation.objects.filter(slug=slug, is_merged=False, is_public=True)
            .prefetch_related("sources", "evidences__source")
            .first()
        )
        if not innovation:
            return Response({"detail": "Nie znaleziono innowacji."}, status=404)

        fmt = (request.query_params.get("export_format") or "json").strip().lower()
        if fmt == "md":
            resp = HttpResponse(
                render_innovation_markdown(innovation),
                content_type="text/markdown; charset=utf-8",
            )
            resp["Content-Disposition"] = f'attachment; filename="{slug}.md"'
            return resp
        if fmt == "csv":
            resp = HttpResponse(
                render_innovation_csv(innovation),
                content_type="text/csv; charset=utf-8",
            )
            resp["Content-Disposition"] = f'attachment; filename="{slug}.csv"'
            return resp
        return Response(build_innovation_export_dict(innovation))
