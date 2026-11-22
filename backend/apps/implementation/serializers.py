from rest_framework import serializers

from apps.innovations.serializers import InnovationRegisteredDetailSerializer

from .models import ImplementationPlan, ImplementationStep


class ImplementationStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImplementationStep
        fields = [
            "id",
            "phase_number",
            "phase_key",
            "title",
            "actions",
            "deliverable",
            "status",
            "notes",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "phase_number",
            "phase_key",
            "title",
            "actions",
            "deliverable",
            "updated_at",
        ]


class ImplementationStepUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ImplementationStep.STATUS_CHOICES, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class ImplementationPlanSerializer(serializers.ModelSerializer):
    innovation = InnovationRegisteredDetailSerializer(read_only=True)
    steps = ImplementationStepSerializer(many=True, read_only=True)

    class Meta:
        model = ImplementationPlan
        fields = [
            "id",
            "innovation",
            "variant",
            "variant_rationale",
            "recommendation_path",
            "recommendation_rationale",
            "organization_snapshot",
            "comparison_slugs",
            "requirements",
            "risks",
            "success_metrics",
            "missing_info_blockers",
            "similar_innovations",
            "partner_archetypes",
            "ai_personalized",
            "user_reported_issues",
            "steps",
            "created_at",
            "updated_at",
        ]


class ImplementationPlanCreateSerializer(serializers.Serializer):
    innovation_slug = serializers.SlugField()
    comparison_slugs = serializers.ListField(
        child=serializers.SlugField(),
        required=False,
        default=list,
    )


class ImplementationPlanUpdateSerializer(serializers.Serializer):
    user_reported_issues = serializers.CharField(required=False, allow_blank=True)


class AdminImplementationOverviewSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    user_email = serializers.EmailField()
    user_name = serializers.CharField()
    organization_name = serializers.CharField()
    organization_type = serializers.CharField()
    deployment_location = serializers.CharField()
    innovation_slug = serializers.SlugField()
    innovation_title = serializers.CharField()
    comparison_slugs = serializers.ListField(child=serializers.SlugField())
    variant = serializers.CharField()
    recommendation_path = serializers.CharField()
    current_phase = serializers.IntegerField()
    completed_steps_count = serializers.IntegerField()
    total_steps_count = serializers.IntegerField()
    completed_titles = serializers.ListField(child=serializers.CharField())
    user_reported_issues = serializers.CharField()
    step_notes = serializers.ListField(child=serializers.CharField())
    updated_at = serializers.DateTimeField()
