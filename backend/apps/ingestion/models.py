from django.db import models


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

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} [{self.status}]"


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
