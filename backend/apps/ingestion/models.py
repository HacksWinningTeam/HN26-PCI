from django.db import models
from django.db.models import Count, Q

from apps.innovations.models import Innovation


class SourceFeedQuerySet(models.QuerySet):
    def with_local_counts(self):
        return self.annotate(
            _local_records_count=Count(
                "sources__innovation",
                filter=Q(sources__innovation__is_merged=False),
                distinct=True,
            )
        )


class SourceFeed(models.Model):
    STATUS_CHOICES = [
        ("active", "Aktywne"),
        ("error", "Błąd pobierania"),
        ("stale", "Nieaktualne źródło"),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=64)
    url = models.URLField(max_length=500)
    method = models.CharField(max_length=64)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="active")
    error_message = models.TextField(blank=True, default="")
    last_synced_at = models.DateTimeField()
    records_count = models.PositiveIntegerField(default=0)
    config = models.JSONField(default=dict, blank=True)
    harvest_state = models.JSONField(default=dict, blank=True)
    sources = models.ManyToManyField(
        "innovations.InnovationSource", related_name="feeds", blank=True
    )

    objects = SourceFeedQuerySet.as_manager()

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} [{self.status}]"

    @property
    def local_records_count(self) -> int:
        if hasattr(self, "_local_records_count"):
            return self._local_records_count
        return (
            self.sources.filter(innovation__is_merged=False)
            .values("innovation_id")
            .distinct()
            .count()
        )


class IngestionRun(models.Model):
    started_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=32, default="completed")
    new_records = models.PositiveIntegerField(default=0)
    updated_records = models.PositiveIntegerField(default=0)
    errors_count = models.PositiveIntegerField(default=0)
    summary = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.started_at:%Y-%m-%d %H:%M} [{self.status}]"


class InnovationAuditLog(models.Model):
    ACTION_CHOICES = [
        ("ingest", "Pozyskanie"),
        ("edit", "Edycja"),
        ("verify", "Weryfikacja"),
        ("reject", "Odrzucenie"),
        ("merge", "Scalenie duplikatu"),
        ("classification_update", "Aktualizacja klasyfikacji"),
    ]

    innovation = models.ForeignKey(
        Innovation,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    actor = models.CharField(max_length=150, default="system")
    verification_method = models.CharField(max_length=255, blank=True, default="")
    changes = models.JSONField(default=dict)
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.innovation.slug}: {self.action} ({self.actor})"
