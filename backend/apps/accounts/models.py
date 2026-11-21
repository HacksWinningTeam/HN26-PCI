from django.conf import settings
from django.db import models


class AdopterProfile(models.Model):
    ORG_TYPE_CHOICES = [
        ("public_institution", "Gmina lub instytucja publiczna"),
        ("school", "Szkoła"),
        ("university", "Uczelnia"),
        ("social_org", "Organizacja społeczna"),
        ("company", "Firma"),
        ("startup", "Startup"),
        ("other", "Inna organizacja"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="adopter_profile",
    )
    organization_type = models.CharField(
        max_length=32,
        choices=ORG_TYPE_CHOICES,
        default="public_institution",
    )
    organization_name = models.CharField(max_length=255, blank=True, default="")
    role_title = models.CharField(max_length=120, blank=True, default="")
    deployment_location = models.CharField(max_length=120, blank=True, default="")
    potential_users_count = models.PositiveIntegerField(default=100)
    current_approach = models.TextField(blank=True, default="")
    available_resources = models.TextField(blank=True, default="")
    team_competencies = models.TextField(blank=True, default="")
    target_timeline = models.CharField(max_length=120, blank=True, default="")
    key_constraints = models.TextField(blank=True, default="")
    is_pci_admin = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.email} ({self.organization_name or self.organization_type})"

    def is_complete(self) -> bool:
        return bool(
            self.organization_name.strip()
            and self.role_title.strip()
            and self.deployment_location.strip()
        )
