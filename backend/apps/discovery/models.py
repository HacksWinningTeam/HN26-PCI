from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.innovations.models import Innovation


class ScoringConfig(models.Model):
    """Versioned matching weights, thresholds, and classification rules."""

    version = models.CharField(max_length=32, unique=True)
    is_active = models.BooleanField(default=True)
    problem_weight = models.PositiveSmallIntegerField(default=40)
    sector_weight = models.PositiveSmallIntegerField(default=20)
    beneficiary_weight = models.PositiveSmallIntegerField(default=20)
    organization_fit_weight = models.PositiveSmallIntegerField(default=20)
    min_score_threshold = models.PositiveSmallIntegerField(default=30)
    low_confidence_threshold = models.PositiveSmallIntegerField(default=45)
    classification_rules = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return (
            f"{self.version} ({self.problem_weight}/{self.sector_weight}/"
            f"{self.beneficiary_weight}/{self.organization_fit_weight})"
        )

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.is_active:
            ScoringConfig.objects.filter(is_active=True).exclude(pk=self.pk).update(
                is_active=False
            )
        super().save(*args, **kwargs)

    def clean(self) -> None:
        total = (
            self.problem_weight
            + self.sector_weight
            + self.beneficiary_weight
            + self.organization_fit_weight
        )
        if total != 100:
            raise ValidationError("Suma wag scoringu musi wynosić dokładnie 100%.")

    @classmethod
    def get_active(cls) -> "ScoringConfig":
        active = cls.objects.filter(is_active=True).order_by("-updated_at", "-id").first()
        if active:
            return active
        config, _ = cls.objects.get_or_create(
            version="v1.0",
            defaults={"is_active": True},
        )
        return config


class ProblemQuery(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    problem_text = models.TextField()
    sector = models.CharField(max_length=64, blank=True, default="")
    beneficiary_groups = models.JSONField(default=list)
    organization_type = models.CharField(max_length=32, blank=True, default="")
    deployment_location = models.CharField(max_length=120, blank=True, default="")
    problem_scale = models.CharField(max_length=64, blank=True, default="")
    preferred_maturity = models.CharField(max_length=32, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.problem_text[:60]


class InnovationMatch(models.Model):
    query = models.ForeignKey(
        ProblemQuery,
        on_delete=models.CASCADE,
        related_name="matches",
    )
    innovation = models.ForeignKey(
        Innovation,
        on_delete=models.CASCADE,
        related_name="problem_matches",
    )
    problem_score = models.PositiveSmallIntegerField()
    sector_score = models.PositiveSmallIntegerField()
    beneficiary_score = models.PositiveSmallIntegerField()
    organization_fit_score = models.PositiveSmallIntegerField()
    overall_score = models.PositiveSmallIntegerField()
    primary_reason = models.CharField(max_length=255)
    reasons = models.JSONField(default=list)
    scoring_version = models.CharField(max_length=32, default="v1.0")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-overall_score", "innovation_id"]

    def __str__(self) -> str:
        return f"Query#{self.query_id} -> {self.innovation.slug} ({self.overall_score}%)"


class AnalyticsEvent(models.Model):
    """GDPR-compliant anonymous usage telemetry (no user FK, IP, or session ID)."""

    EVENT_TYPE_CHOICES = [
        ("view", "Wyświetlenie karty innowacji"),
        ("filter", "Użycie filtra katalogu"),
        ("search", "Wyszukiwanie lub dopasowanie"),
    ]

    event_type = models.CharField(max_length=16, choices=EVENT_TYPE_CHOICES)
    innovation_slug = models.SlugField(max_length=120, blank=True, default="")
    primary_area = models.CharField(max_length=32, blank=True, default="")
    sector = models.CharField(max_length=64, blank=True, default="")
    beneficiary_group = models.CharField(max_length=64, blank=True, default="")
    filter_key = models.CharField(max_length=64, blank=True, default="")
    filter_value = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.event_type}: {self.innovation_slug or self.sector or self.filter_key}"


class MatchNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    email = models.EmailField()
    problem_text = models.TextField(blank=True, default="")
    filters_snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.email} ({self.created_at:%Y-%m-%d})"


class SavedComparison(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_comparisons",
    )
    title = models.CharField(max_length=255)
    innovation_slugs = models.JSONField(default=list)
    query_context = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class SavedInnovation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_innovations",
    )
    innovation = models.ForeignKey(
        Innovation,
        on_delete=models.CASCADE,
        related_name="saved_by_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "innovation")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.innovation.slug}"
