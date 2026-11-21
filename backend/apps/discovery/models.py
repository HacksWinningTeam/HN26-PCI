from django.conf import settings
from django.db import models

from apps.innovations.models import Innovation


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
