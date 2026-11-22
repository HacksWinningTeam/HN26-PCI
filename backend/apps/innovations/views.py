from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.authentication import SessionAuthentication
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated

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
            OpenApiParameter("primary_area", str),
            OpenApiParameter("character", str),
            OpenApiParameter("sector", str),
            OpenApiParameter("beneficiary", str),
            OpenApiParameter("origin_location", str),
            OpenApiParameter("deployment_level", str),
            OpenApiParameter("trl_min", int),
            OpenApiParameter("organization_type", str),
            OpenApiParameter("verified_only", bool),
            OpenApiParameter("sort", str, description="deployment_level | name | updated_at"),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = Innovation.objects.filter(is_merged=False, is_public=True)
        params = self.request.query_params

        q = params.get("q", "").strip().lower()
        primary_area = params.get("primary_area", "").strip()
        character = params.get("character", "").strip()
        sector = params.get("sector", "").strip()
        beneficiary = params.get("beneficiary", "").strip()
        origin_location = params.get("origin_location", "").strip().lower()
        deployment_level = params.get("deployment_level", "").strip()
        trl_min = params.get("trl_min", "").strip()
        org_type = params.get("organization_type", "").strip()
        verified_only = params.get("verified_only", "").lower() in {"1", "true", "yes"}
        sort = params.get("sort", "updated_at").strip()

        if primary_area:
            qs = qs.filter(primary_area=primary_area)
        if deployment_level:
            qs = qs.filter(deployment_level=deployment_level)
        if org_type:
            qs = qs.filter(organization_type=org_type)
        if origin_location:
            qs = qs.filter(origin_location__icontains=origin_location)
        if verified_only:
            qs = qs.filter(verification_status="verified")
        if trl_min.isdigit():
            qs = qs.filter(trl__gte=int(trl_min))

        items = list(qs)

        if character:
            items = [i for i in items if character in (i.innovation_character or [])]
        if sector:
            items = [i for i in items if sector in (i.sectors or [])]
        if beneficiary:
            items = [i for i in items if beneficiary in (i.beneficiary_groups or [])]
        if q:
            items = [
                i
                for i in items
                if q
                in (
                    f"{i.title_pl} {i.title_en} {i.short_summary_pl} "
                    f"{i.problem_pl} {i.solution_pl} {i.organization_name} {' '.join(i.tags or [])}"
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
