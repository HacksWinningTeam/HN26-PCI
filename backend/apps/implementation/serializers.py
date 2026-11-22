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
    outcome_attachment_url = serializers.SerializerMethodField()

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
            "pilot_started_at",
            "adopter_deployment_status",
            "deployment_started_on",
            "reached_beneficiaries_count",
            "metric_before",
            "metric_after",
            "outcome_summary",
            "outcome_visibility",
            "evidence_url",
            "outcome_attachment_name",
            "outcome_attachment_content_type",
            "outcome_attachment_size",
            "outcome_attachment_uploaded_at",
            "outcome_attachment_url",
            "deployment_reported_at",
            "pci_transfer_status",
            "pci_transfer_note",
            "pci_transfer_verified_at",
            "steps",
            "created_at",
            "updated_at",
        ]

    def get_outcome_attachment_url(self, obj: ImplementationPlan) -> str:
        if not obj.outcome_attachment_name:
            return ""
        return f"/api/implementation-plans/{obj.id}/attachment/"


class ImplementationPlanCreateSerializer(serializers.Serializer):
    innovation_slug = serializers.SlugField()
    comparison_slugs = serializers.ListField(
        child=serializers.SlugField(),
        required=False,
        default=list,
    )


class ImplementationPlanUpdateSerializer(serializers.Serializer):
    user_reported_issues = serializers.CharField(required=False, allow_blank=True)
    adopter_deployment_status = serializers.ChoiceField(
        choices=ImplementationPlan.ADOPTER_DEPLOYMENT_STATUS_CHOICES,
        required=False,
    )
    deployment_started_on = serializers.DateField(required=False, allow_null=True)
    reached_beneficiaries_count = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=10_000_000,
    )
    metric_before = serializers.CharField(required=False, allow_blank=True, max_length=160)
    metric_after = serializers.CharField(required=False, allow_blank=True, max_length=160)
    outcome_summary = serializers.CharField(required=False, allow_blank=True)
    outcome_visibility = serializers.ChoiceField(
        choices=ImplementationPlan.OUTCOME_VISIBILITY_CHOICES,
        required=False,
    )
    evidence_url = serializers.URLField(
        required=False,
        allow_blank=True,
        max_length=500,
    )


class ImplementationAttachmentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class AdminImplementationOverviewSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    user_email = serializers.EmailField()
    user_name = serializers.CharField()
    organization_name = serializers.CharField()
    organization_type = serializers.CharField()
    deployment_location = serializers.CharField()
    source_organization_name = serializers.CharField()
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
    adopter_deployment_status = serializers.CharField()
    pci_transfer_status = serializers.CharField()
    reached_beneficiaries_count = serializers.IntegerField(allow_null=True)
    metric_before = serializers.CharField()
    metric_after = serializers.CharField()
    outcome_summary = serializers.CharField()
    outcome_attachment_name = serializers.CharField()
    outcome_attachment_url = serializers.CharField()
    updated_at = serializers.DateTimeField()


class AdminImpactFunnelSerializer(serializers.Serializer):
    created_plans = serializers.IntegerField()
    started_pilots = serializers.IntegerField()
    confirmed_deployments = serializers.IntegerField()
    verified_effects = serializers.IntegerField()
    awaiting_pci_review = serializers.IntegerField()
    total_reached_beneficiaries = serializers.IntegerField()


class AdminImpactTransferSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    user_email = serializers.EmailField()
    user_name = serializers.CharField()
    organization_name = serializers.CharField()
    organization_type = serializers.CharField()
    deployment_location = serializers.CharField()
    source_organization_name = serializers.CharField()
    innovation_slug = serializers.SlugField()
    innovation_title = serializers.CharField()
    primary_area = serializers.CharField()
    variant = serializers.CharField()
    stage_key = serializers.CharField()
    stage_label = serializers.CharField()
    current_phase = serializers.IntegerField()
    completed_steps_count = serializers.IntegerField()
    total_steps_count = serializers.IntegerField()
    pilot_started_at = serializers.DateTimeField(allow_null=True)
    adopter_deployment_status = serializers.CharField()
    deployment_started_on = serializers.DateField(allow_null=True)
    reached_beneficiaries_count = serializers.IntegerField(allow_null=True)
    metric_before = serializers.CharField()
    metric_after = serializers.CharField()
    outcome_summary = serializers.CharField()
    outcome_visibility = serializers.CharField()
    evidence_url = serializers.CharField()
    outcome_attachment_name = serializers.CharField()
    outcome_attachment_size = serializers.IntegerField(allow_null=True)
    outcome_attachment_uploaded_at = serializers.DateTimeField(allow_null=True)
    outcome_attachment_url = serializers.CharField()
    deployment_reported_at = serializers.DateTimeField(allow_null=True)
    pci_transfer_status = serializers.CharField()
    pci_transfer_note = serializers.CharField()
    pci_transfer_verified_at = serializers.DateTimeField(allow_null=True)
    awaiting_pci_review = serializers.BooleanField()
    updated_at = serializers.DateTimeField()


class AdminImpactRadarSerializer(serializers.Serializer):
    funnel = AdminImpactFunnelSerializer()
    transfers = AdminImpactTransferSerializer(many=True)


class AdminTransferVerifySerializer(serializers.Serializer):
    pci_transfer_status = serializers.ChoiceField(
        choices=[
            ("deployment_confirmed", "Potwierdzone wdrożenie"),
            ("effect_verified", "Zweryfikowany efekt"),
            ("needs_clarification", "Wymaga uzupełnienia"),
        ]
    )
    pci_transfer_note = serializers.CharField(required=False, allow_blank=True, default="")
