from django.db import models


class Innovation(models.Model):
    PRIMARY_AREA_CHOICES = [
        ("technological", "Technologiczny"),
        ("educational", "Edukacyjny"),
        ("administrative", "Administracyjny"),
    ]
    DEPLOYMENT_LEVEL_CHOICES = [
        ("concept", "Koncepcja"),
        ("prototype", "Prototyp"),
        ("tests", "Testy"),
        ("pilot", "Wdrożenie pilotażowe"),
        ("deployed", "Stosowane w praktyce"),
    ]
    VERIFICATION_STATUS_CHOICES = [
        ("verified", "Zweryfikowany"),
        ("pending_review", "Oczekuje na weryfikację"),
        ("stale", "Nieaktualny"),
        ("conflict", "Sprzeczne dane"),
    ]
    ORG_TYPE_CHOICES = [
        ("public_institution", "Gmina lub instytucja publiczna"),
        ("school", "Szkoła"),
        ("university", "Uczelnia"),
        ("social_org", "Organizacja społeczna"),
        ("company", "Firma"),
        ("startup", "Startup"),
        ("other", "Inna organizacja"),
    ]

    slug = models.SlugField(max_length=120, unique=True)
    title_pl = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255)
    short_summary_pl = models.TextField()
    short_summary_en = models.TextField()
    problem_pl = models.TextField()
    problem_en = models.TextField()
    solution_pl = models.TextField()
    solution_en = models.TextField()

    primary_area = models.CharField(max_length=32, choices=PRIMARY_AREA_CHOICES)
    innovation_character = models.JSONField(default=list)
    sectors = models.JSONField(default=list)
    beneficiary_groups = models.JSONField(default=list)
    target_org_types = models.JSONField(default=list)
    tags = models.JSONField(default=list)

    organization_name = models.CharField(max_length=255)
    organization_type = models.CharField(max_length=32, choices=ORG_TYPE_CHOICES)
    origin_location = models.CharField(max_length=120)

    deployment_level = models.CharField(max_length=32, choices=DEPLOYMENT_LEVEL_CHOICES)
    trl = models.PositiveSmallIntegerField(null=True, blank=True)
    oslo_compliant = models.BooleanField(default=True)

    verification_status = models.CharField(
        max_length=32,
        choices=VERIFICATION_STATUS_CHOICES,
        default="verified",
    )
    verification_method = models.CharField(max_length=255, default="")
    fetched_at = models.DateField()
    last_verified_at = models.DateField()
    updated_at = models.DateTimeField(auto_now=True)

    # Deterministic 0-100 sub-scores & structured assessment metadata
    scores = models.JSONField(default=dict)
    strengths = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    missing_info = models.JSONField(default=list)
    conflicting_info = models.JSONField(default=list)
    required_resources = models.JSONField(default=list)
    metrics = models.JSONField(default=list)
    partner_archetypes = models.JSONField(default=list)
    suggested_next_step = models.CharField(max_length=64, default="pilot")

    # Contact details only exposed to registered users in level-3 / plan endpoints
    contact_info = models.JSONField(default=dict)

    duplicate_of = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="duplicates",
    )
    is_merged = models.BooleanField(default=False)

    class Meta:
        ordering = ["-last_verified_at", "title_pl"]

    def __str__(self) -> str:
        return self.title_pl


class InnovationSource(models.Model):
    innovation = models.ForeignKey(
        Innovation,
        on_delete=models.CASCADE,
        related_name="sources",
    )
    label = models.CharField(max_length=255)
    registry = models.CharField(max_length=120)
    url = models.URLField(max_length=500)
    fetched_at = models.DateField()
    last_verified_at = models.DateField()
    is_available = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.registry}: {self.label}"


class Evidence(models.Model):
    KIND_CHOICES = [
        ("verified_fact", "Fakt potwierdzony"),
        ("source_declaration", "Deklaracja źródła"),
        ("system_calculation", "Obliczenie systemu"),
        ("ai_estimate", "Szacunek lub klasyfikacja AI"),
        ("missing_info", "Brakująca informacja"),
    ]

    innovation = models.ForeignKey(
        Innovation,
        on_delete=models.CASCADE,
        related_name="evidences",
    )
    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    text_pl = models.TextField()
    text_en = models.TextField()
    source = models.ForeignKey(
        InnovationSource,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="evidences",
    )
    confidence = models.CharField(max_length=16, blank=True, default="")
    limitation_note = models.CharField(max_length=255, blank=True, default="")

    def __str__(self) -> str:
        return f"[{self.kind}] {self.text_pl[:50]}"
