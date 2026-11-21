from rest_framework import serializers

from apps.innovations.serializers import InnovationSummarySerializer

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


class DiscoveryMatchResponseSerializer(serializers.Serializer):
    sufficient = serializers.BooleanField()
    guidance_message = serializers.CharField()
    low_confidence = serializers.BooleanField()
    low_confidence_reason = serializers.CharField(allow_blank=True)
    results = MatchItemSerializer(many=True)


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
