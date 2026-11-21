from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.innovations.models import Innovation

from .models import IngestionRun, SourceFeed
from .serializers import (
    AdminDataQualityResponseSerializer,
    AdminInnovationItemSerializer,
    AdminInnovationPatchSerializer,
    IngestionRunSerializer,
    MergeDuplicateResponseSerializer,
)


class AdminDataQualityView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

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
                "all_records": AdminInnovationItemSerializer(active, many=True).data,
                "source_feeds": SourceFeed.objects.values(
                    "id",
                    "name",
                    "category",
                    "url",
                    "method",
                    "status",
                    "error_message",
                    "last_synced_at",
                    "records_count",
                ),
                "ingestion_runs": IngestionRunSerializer(runs, many=True).data,
            }
        )


class AdminInnovationUpdateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

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
        for field, value in serializer.validated_data.items():
            setattr(innovation, field, value)
        if serializer.validated_data.get("verification_status") == "verified":
            innovation.last_verified_at = timezone.localdate()
            if not innovation.verification_method:
                innovation.verification_method = "Zweryfikowano ręcznie przez administratora PCI"
        innovation.save()
        return Response(AdminInnovationItemSerializer(innovation).data)


class AdminMergeDuplicateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Admin"],
        request=None,
        responses={200: MergeDuplicateResponseSerializer},
        summary="Merge a duplicate innovation into its primary record",
    )
    def post(self, request, slug: str):
        dup = (
            Innovation.objects.filter(slug=slug, is_merged=False)
            .select_related("duplicate_of")
            .first()
        )
        if not dup or not dup.duplicate_of:
            return Response(
                {"detail": "Rekord nie jest oznaczony jako duplikat."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = dup.duplicate_of
        for src in dup.sources.all():
            src.innovation = target
            src.save(update_fields=["innovation"])
        dup.is_merged = True
        dup.save(update_fields=["is_merged"])

        return Response({"merged_slug": dup.slug, "target_slug": target.slug})


class AdminRunIngestionView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Admin"],
        request=None,
        responses={201: IngestionRunSerializer},
        summary="Trigger a source refresh run",
    )
    def post(self, request):
        now = timezone.now()
        error_feeds = SourceFeed.objects.filter(status="error").count()
        SourceFeed.objects.filter(status="active").update(last_synced_at=now)
        run = IngestionRun.objects.create(
            status="completed_with_warnings" if error_feeds else "completed",
            new_records=0,
            updated_records=Innovation.objects.filter(is_merged=False).count(),
            errors_count=error_feeds,
            summary=(
                "Odświeżono aktywne źródła publiczne; "
                "wykryto błędy połączenia w nieosiągalnych kanałach."
            ),
        )
        return Response(IngestionRunSerializer(run).data, status=status.HTTP_201_CREATED)
