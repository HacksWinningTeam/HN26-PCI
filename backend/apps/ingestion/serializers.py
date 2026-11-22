from rest_framework import serializers

from apps.innovations.models import Innovation

from .models import IngestionRun, InnovationAuditLog, SourceFeed


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
            "oslo_compliant",
            "oslo_assessment",
            "classification_provenance",
            "radar_user_types",
            "patent_status",
            "verification_status",
            "verification_method",
            "is_public",
            "is_incomplete",
            "is_synthetic_demo",
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
    incomplete_records = AdminInnovationItemSerializer(many=True)
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
    is_public = serializers.BooleanField(required=False)
    is_incomplete = serializers.BooleanField(required=False)
    is_synthetic_demo = serializers.BooleanField(required=False)
    patent_status = serializers.ChoiceField(
        choices=Innovation.PATENT_STATUS_CHOICES,
        required=False,
    )
    oslo_compliant = serializers.BooleanField(required=False)
    oslo_assessment = serializers.DictField(required=False)
    classification_provenance = serializers.DictField(required=False)
    radar_user_types = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    conflicting_info = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    missing_info = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )


class InnovationAuditLogSerializer(serializers.ModelSerializer):
    innovation_slug = serializers.CharField(source="innovation.slug", read_only=True)

    class Meta:
        model = InnovationAuditLog
        fields = [
            "id",
            "innovation_slug",
            "action",
            "actor",
            "verification_method",
            "changes",
            "note",
            "created_at",
        ]


class MergeDuplicateResponseSerializer(serializers.Serializer):
    merged_slug = serializers.SlugField()
    target_slug = serializers.SlugField()


class AdminRunIngestionRequestSerializer(serializers.Serializer):
    live_fetch = serializers.BooleanField(required=False, default=False)
    feed_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        default=list,
    )
