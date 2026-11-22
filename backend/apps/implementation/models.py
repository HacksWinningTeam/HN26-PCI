from django.conf import settings
from django.db import models

from apps.innovations.models import Innovation


class ImplementationPlan(models.Model):
    VARIANT_CHOICES = [
        ("validation", "Plan walidacji"),
        ("pilot", "Plan pilotażu"),
        ("transfer_deployment", "Plan transferu i wdrożenia"),
    ]
    RECOMMENDATION_PATH_CHOICES = [
        ("contact_creator", "Kontakt z twórcą / właścicielem IP"),
        ("pilot", "Przeprowadzenie pilotażu"),
        ("transfer", "Transfer do organizacji"),
        ("partnership", "Nawiązanie partnerstwa"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="implementation_plans",
    )
    innovation = models.ForeignKey(
        Innovation,
        on_delete=models.CASCADE,
        related_name="implementation_plans",
    )
    variant = models.CharField(max_length=32, choices=VARIANT_CHOICES)
    variant_rationale = models.TextField(default="")
    recommendation_path = models.CharField(
        max_length=32,
        choices=RECOMMENDATION_PATH_CHOICES,
        default="pilot",
    )
    recommendation_rationale = models.TextField(blank=True, default="")
    organization_snapshot = models.JSONField(default=dict)
    comparison_slugs = models.JSONField(default=list)
    requirements = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    success_metrics = models.JSONField(default=list)
    missing_info_blockers = models.JSONField(default=list)
    similar_innovations = models.JSONField(default=list)
    partner_archetypes = models.JSONField(default=list)
    ai_personalized = models.BooleanField(default=False)
    user_reported_issues = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.email} -> {self.innovation.slug} ({self.variant})"


class ImplementationStep(models.Model):
    STATUS_CHOICES = [
        ("not_started", "Nierozpoczęty"),
        ("in_progress", "Rozpoczęty"),
        ("completed", "Ukończony"),
    ]

    plan = models.ForeignKey(
        ImplementationPlan,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    phase_number = models.PositiveSmallIntegerField()
    phase_key = models.CharField(max_length=48)
    title = models.CharField(max_length=255)
    actions = models.JSONField(default=list)
    deliverable = models.CharField(max_length=255)
    status = models.CharField(
        max_length=24,
        choices=STATUS_CHOICES,
        default="not_started",
    )
    notes = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["phase_number"]
        unique_together = ("plan", "phase_number")

    def __str__(self) -> str:
        return f"Faza {self.phase_number}: {self.title} [{self.status}]"
