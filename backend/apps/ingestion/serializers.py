from rest_framework import serializers

from apps.discovery.models import ScoringConfig
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


class AdminInnovationCreateSerializer(serializers.Serializer):
    title_pl = serializers.CharField(max_length=255)
    title_en = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    short_summary_pl = serializers.CharField()
    short_summary_en = serializers.CharField(required=False, allow_blank=True, default="")
    problem_pl = serializers.CharField()
    problem_en = serializers.CharField(required=False, allow_blank=True, default="")
    solution_pl = serializers.CharField()
    solution_en = serializers.CharField(required=False, allow_blank=True, default="")
    primary_area = serializers.ChoiceField(choices=Innovation.PRIMARY_AREA_CHOICES)
    innovation_character = serializers.ListField(
        child=serializers.CharField(), required=False, default=lambda: ["product"]
    )
    sectors = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    beneficiary_groups = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    target_org_types = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    organization_name = serializers.CharField(max_length=255)
    organization_type = serializers.ChoiceField(
        choices=Innovation.ORG_TYPE_CHOICES, default="other"
    )
    origin_location = serializers.CharField(max_length=120)
    deployment_level = serializers.ChoiceField(
        choices=Innovation.DEPLOYMENT_LEVEL_CHOICES, default="pilot"
    )
    trl = serializers.IntegerField(min_value=1, max_value=9, required=False, allow_null=True)
    patent_status = serializers.ChoiceField(
        choices=Innovation.PATENT_STATUS_CHOICES, required=False, default="none"
    )
    oslo_compliant = serializers.BooleanField(required=False, default=True)
    verification_status = serializers.ChoiceField(
        choices=Innovation.VERIFICATION_STATUS_CHOICES, required=False, default="verified"
    )
    verification_method = serializers.CharField(
        required=False,
        allow_blank=True,
        default="Ręczny import zweryfikowanego rekordu przez operatora PCI",
    )
    is_public = serializers.BooleanField(required=False, default=True)
    source_url = serializers.URLField(required=False, allow_blank=True, default="")
    source_label = serializers.CharField(required=False, allow_blank=True, default="")
    source_registry = serializers.CharField(
        required=False, allow_blank=True, default="Import ręczny PCI"
    )
    contact_info = serializers.DictField(required=False, default=dict)
    ignore_duplicate = serializers.BooleanField(required=False, default=False)


class AdminInnovationCreateResponseSerializer(serializers.Serializer):
    innovation = AdminInnovationItemSerializer()
    potential_duplicate_slug = serializers.CharField(allow_blank=True)
    similarity_pct = serializers.IntegerField()


class AdminInnovationRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class MergeDuplicateRequestSerializer(serializers.Serializer):
    target_slug = serializers.SlugField(required=False, allow_blank=True, default="")


class ScoringConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringConfig
        fields = [
            "id",
            "version",
            "is_active",
            "problem_weight",
            "sector_weight",
            "beneficiary_weight",
            "organization_fit_weight",
            "min_score_threshold",
            "low_confidence_threshold",
            "classification_rules",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class ScoringConfigPatchSerializer(serializers.Serializer):
    version = serializers.CharField(max_length=32, required=False)
    problem_weight = serializers.IntegerField(min_value=0, max_value=100, required=False)
    sector_weight = serializers.IntegerField(min_value=0, max_value=100, required=False)
    beneficiary_weight = serializers.IntegerField(min_value=0, max_value=100, required=False)
    organization_fit_weight = serializers.IntegerField(min_value=0, max_value=100, required=False)
    min_score_threshold = serializers.IntegerField(min_value=0, max_value=100, required=False)
    low_confidence_threshold = serializers.IntegerField(min_value=0, max_value=100, required=False)
    classification_rules = serializers.DictField(required=False)


class AdminScoringConfigResponseSerializer(serializers.Serializer):
    active = ScoringConfigSerializer()
    versions = ScoringConfigSerializer(many=True)
