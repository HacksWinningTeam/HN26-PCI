from rest_framework import serializers

from .models import AdopterProfile


class AdopterProfileSerializer(serializers.ModelSerializer):
    is_complete = serializers.SerializerMethodField()

    class Meta:
        model = AdopterProfile
        fields = [
            "organization_type",
            "organization_name",
            "role_title",
            "deployment_location",
            "potential_users_count",
            "current_approach",
            "available_resources",
            "team_competencies",
            "target_timeline",
            "key_constraints",
            "is_pci_admin",
            "is_complete",
            "updated_at",
        ]
        read_only_fields = ["is_pci_admin", "is_complete", "updated_at"]

    def get_is_complete(self, obj: AdopterProfile) -> bool:
        return obj.is_complete()


class UserSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    is_pci_admin = serializers.BooleanField()


class AuthMeResponseSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    user = UserSummarySerializer(allow_null=True)
    profile = AdopterProfileSerializer(allow_null=True)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    organization_type = serializers.ChoiceField(
        choices=AdopterProfile.ORG_TYPE_CHOICES,
        required=False,
        default="public_institution",
    )
    organization_name = serializers.CharField(required=False, allow_blank=True, default="")
    role_title = serializers.CharField(required=False, allow_blank=True, default="")
    deployment_location = serializers.CharField(required=False, allow_blank=True, default="")


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LogoutResponseSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
