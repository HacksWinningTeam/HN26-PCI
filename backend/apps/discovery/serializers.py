from rest_framework import serializers

from apps.innovations.serializers import (
    InnovationDetailSerializer,
    InnovationSummarySerializer,
)

from .models import MatchNotification, SavedComparison, SavedInnovation


class DiscoveryMatchRequestSerializer(serializers.Serializer):
    problem_text = serializers.CharField(allow_blank=True, default="")
    sector = serializers.CharField(required=False, allow_blank=True, default="")
    beneficiary_groups = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    organization_type = serializers.CharField(required=False, allow_blank=True, default="")
    deployment_location = serializers.CharField(required=False, allow_blank=True, default="")
    problem_scale = serializers.CharField(required=False, allow_blank=True, default="")
    preferred_maturity = serializers.CharField(required=False, allow_blank=True, default="")


class MatchItemSerializer(serializers.Serializer):
    innovation = InnovationSummarySerializer()
    problem_score = serializers.IntegerField()
    sector_score = serializers.IntegerField()
    beneficiary_score = serializers.IntegerField()
    organization_fit_score = serializers.IntegerField()
    overall_score = serializers.IntegerField()
    primary_reason = serializers.CharField()
    reasons = serializers.ListField(child=serializers.CharField())


class SuggestedFieldsSerializer(serializers.Serializer):
    sectors = serializers.ListField(child=serializers.CharField())
    beneficiary_groups = serializers.ListField(child=serializers.CharField())
    organization_type = serializers.CharField(allow_blank=True)
    deployment_location = serializers.CharField(allow_blank=True)


class DiscoveryMatchResponseSerializer(serializers.Serializer):
    sufficient = serializers.BooleanField()
    completeness_percent = serializers.IntegerField()
    missing_fields = serializers.ListField(child=serializers.CharField())
    suggested_fields = SuggestedFieldsSerializer()
    guidance_message = serializers.CharField()
    low_confidence = serializers.BooleanField()
    low_confidence_reason = serializers.CharField(allow_blank=True)
    scoring_version = serializers.CharField(default="v1.0")
    results = MatchItemSerializer(many=True)


class DiscoveryCompareRequestSerializer(serializers.Serializer):
    innovation_slugs = serializers.ListField(
        child=serializers.SlugField(),
        min_length=2,
        max_length=3,
    )
    problem_text = serializers.CharField(required=False, allow_blank=True, default="")
    sector = serializers.CharField(required=False, allow_blank=True, default="")
    beneficiary_groups = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )
    organization_type = serializers.CharField(required=False, allow_blank=True, default="")


class EvidenceQualitySummarySerializer(serializers.Serializer):
    verified_facts_count = serializers.IntegerField()
    declarations_count = serializers.IntegerField()
    system_calculations_count = serializers.IntegerField()
    ai_estimates_count = serializers.IntegerField()
    missing_info_count = serializers.IntegerField()
    sources_count = serializers.IntegerField()
    available_sources_count = serializers.IntegerField()


class CompareMatchBreakdownSerializer(serializers.Serializer):
    problem_score = serializers.IntegerField()
    sector_score = serializers.IntegerField()
    beneficiary_score = serializers.IntegerField()
    organization_fit_score = serializers.IntegerField()
    overall_score = serializers.IntegerField()
    primary_reason = serializers.CharField()
    reasons = serializers.ListField(child=serializers.CharField())


class CompareItemSerializer(serializers.Serializer):
    innovation = InnovationDetailSerializer()
    evidence_quality = EvidenceQualitySummarySerializer()
    match_breakdown = CompareMatchBreakdownSerializer(allow_null=True)


class DiscoveryCompareResponseSerializer(serializers.Serializer):
    scoring_version = serializers.CharField()
    items = CompareItemSerializer(many=True)
    score_leaders = serializers.DictField(child=serializers.CharField())
    highlights = serializers.DictField(child=serializers.CharField())
    differences = serializers.ListField(child=serializers.CharField())


class ComparisonExportRequestSerializer(DiscoveryCompareRequestSerializer):
    export_format = serializers.ChoiceField(
        choices=["json", "md", "csv"],
        required=False,
        default="md",
    )


class MatchNotificationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    problem_text = serializers.CharField(required=False, allow_blank=True, default="")
    filters_snapshot = serializers.DictField(required=False, default=dict)


class MatchNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchNotification
        fields = ["id", "email", "problem_text", "filters_snapshot", "created_at"]


class SavedComparisonCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    innovation_slugs = serializers.ListField(
        child=serializers.SlugField(),
        min_length=2,
        max_length=3,
    )
    query_context = serializers.DictField(required=False, default=dict)


class SavedComparisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedComparison
        fields = ["id", "title", "innovation_slugs", "query_context", "created_at"]


class SavedInnovationCreateSerializer(serializers.Serializer):
    innovation_slug = serializers.SlugField()


class SavedInnovationSerializer(serializers.ModelSerializer):
    innovation = InnovationSummarySerializer(read_only=True)

    class Meta:
        model = SavedInnovation
        fields = ["id", "innovation", "created_at"]
