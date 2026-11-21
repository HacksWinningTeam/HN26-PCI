from rest_framework import serializers

from .models import Evidence, Innovation, InnovationSource


class InnovationSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InnovationSource
        fields = [
            "id",
            "label",
            "registry",
            "url",
            "fetched_at",
            "last_verified_at",
            "is_available",
        ]


class EvidenceSerializer(serializers.ModelSerializer):
    source_id = serializers.IntegerField(read_only=True)
    source_registry = serializers.CharField(
        source="source.registry",
        read_only=True,
        default="",
    )

    class Meta:
        model = Evidence
        fields = [
            "id",
            "kind",
            "text_pl",
            "text_en",
            "source_id",
            "source_registry",
            "confidence",
            "limitation_note",
        ]


class InnovationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Innovation
        fields = [
            "id",
            "slug",
            "title_pl",
            "title_en",
            "short_summary_pl",
            "short_summary_en",
            "problem_pl",
            "problem_en",
            "primary_area",
            "innovation_character",
            "sectors",
            "beneficiary_groups",
            "target_org_types",
            "tags",
            "organization_name",
            "organization_type",
            "origin_location",
            "deployment_level",
            "trl",
            "verification_status",
            "last_verified_at",
            "updated_at",
            "scores",
            "missing_info",
            "suggested_next_step",
        ]


class InnovationDetailSerializer(serializers.ModelSerializer):
    sources = InnovationSourceSerializer(many=True, read_only=True)
    evidences = EvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = Innovation
        fields = [
            "id",
            "slug",
            "title_pl",
            "title_en",
            "short_summary_pl",
            "short_summary_en",
            "problem_pl",
            "problem_en",
            "solution_pl",
            "solution_en",
            "primary_area",
            "innovation_character",
            "sectors",
            "beneficiary_groups",
            "target_org_types",
            "tags",
            "organization_name",
            "organization_type",
            "origin_location",
            "deployment_level",
            "trl",
            "oslo_compliant",
            "verification_status",
            "verification_method",
            "fetched_at",
            "last_verified_at",
            "updated_at",
            "scores",
            "strengths",
            "risks",
            "missing_info",
            "conflicting_info",
            "required_resources",
            "metrics",
            "partner_archetypes",
            "suggested_next_step",
            "sources",
            "evidences",
        ]


class InnovationRegisteredDetailSerializer(InnovationDetailSerializer):
    class Meta(InnovationDetailSerializer.Meta):
        fields = [*InnovationDetailSerializer.Meta.fields, "contact_info"]
