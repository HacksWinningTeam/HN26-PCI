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
    ADOPTER_DEPLOYMENT_STATUS_CHOICES = [
        ("none", "Nie zgłoszono etapu wdrożenia"),
        ("in_pilot", "Trwa pilotaż lub walidacja"),
        ("deployed", "Wdrożono w praktyce"),
        ("stopped", "Zakończono lub wstrzymano"),
    ]
    PCI_TRANSFER_STATUS_CHOICES = [
        ("unverified", "Oczekuje na weryfikację"),
        ("deployment_confirmed", "Potwierdzone wdrożenie"),
        ("effect_verified", "Zweryfikowany efekt"),
        ("needs_clarification", "Wymaga uzupełnienia"),
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
    pilot_started_at = models.DateTimeField(null=True, blank=True)
    adopter_deployment_status = models.CharField(
        max_length=24,
        choices=ADOPTER_DEPLOYMENT_STATUS_CHOICES,
        default="none",
    )
    deployment_started_on = models.DateField(null=True, blank=True)
    reached_beneficiaries_count = models.PositiveIntegerField(null=True, blank=True)
    outcome_summary = models.TextField(blank=True, default="")
    evidence_url = models.URLField(max_length=500, blank=True, default="")
    deployment_reported_at = models.DateTimeField(null=True, blank=True)
    pci_transfer_status = models.CharField(
        max_length=32,
        choices=PCI_TRANSFER_STATUS_CHOICES,
        default="unverified",
    )
    pci_transfer_note = models.TextField(blank=True, default="")
    pci_transfer_verified_at = models.DateTimeField(null=True, blank=True)
    pci_transfer_verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_implementation_transfers",
    )
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
