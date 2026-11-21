from rest_framework import serializers

from apps.innovations.models import Innovation

from .models import IngestionRun, SourceFeed


class SourceFeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceFeed
        fields = [
            "id",
            "name",
            "category",
            "url",
            "method",
            "status",
            "error_message",
            "last_synced_at",
            "records_count",
        ]


class IngestionRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = IngestionRun
        fields = [
            "id",
            "started_at",
            "status",
            "new_records",
            "updated_records",
            "errors_count",
            "summary",
        ]


class AdminInnovationItemSerializer(serializers.ModelSerializer):
    duplicate_of_slug = serializers.CharField(
        source="duplicate_of.slug",
        read_only=True,
        default="",
    )

    class Meta:
        model = Innovation
        fields = [
            "slug",
            "title_pl",
            "short_summary_pl",
            "organization_name",
            "origin_location",
            "primary_area",
            "deployment_level",
            "trl",
            "verification_status",
            "verification_method",
            "last_verified_at",
            "missing_info",
            "conflicting_info",
            "duplicate_of_slug",
            "is_merged",
        ]


class AdminDataQualityResponseSerializer(serializers.Serializer):
    pending_review = AdminInnovationItemSerializer(many=True)
    conflicts_or_missing = AdminInnovationItemSerializer(many=True)
    potential_duplicates = AdminInnovationItemSerializer(many=True)
    stale_records = AdminInnovationItemSerializer(many=True)
    all_records = AdminInnovationItemSerializer(many=True)
    source_feeds = SourceFeedSerializer(many=True)
    ingestion_runs = IngestionRunSerializer(many=True)


class AdminInnovationPatchSerializer(serializers.Serializer):
    title_pl = serializers.CharField(required=False)
    short_summary_pl = serializers.CharField(required=False)
    origin_location = serializers.CharField(required=False)
    verification_status = serializers.ChoiceField(
        choices=Innovation.VERIFICATION_STATUS_CHOICES,
        required=False,
    )
    verification_method = serializers.CharField(required=False)
    conflicting_info = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    missing_info = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )


class MergeDuplicateResponseSerializer(serializers.Serializer):
    merged_slug = serializers.SlugField()
    target_slug = serializers.SlugField()
