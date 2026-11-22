import copy
import io
import json
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ingestion.adapters import RawSourceRecord
from apps.ingestion.locking import IngestionBusyError, ingestion_lock
from apps.ingestion.pipeline import ingest_raw_record

from .assessment import RUBRICS, assess_innovation, public_source_url, validate_dimension
from .models import Evidence, Innovation, InnovationSource

EXCERPT = "Metoda skraca czas badania o 50% w porównaniu z obecną metodą."
MATERIAL = EXCERPT + " Pilotaż obejmuje szkoły; licencja umożliwia adaptację w innych szkołach."


@pytest.fixture
def innovation(settings):
    settings.GEMINI_API_KEY = ""
    record = RawSourceRecord(
        title="Metoda badania", text=MATERIAL, url="https://science.example.org/method",
        registry="Uczelnia", label="Badanie",
    )
    return ingest_raw_record(record)[0]


def quality(source, grade=3):
    return {key: {name: {"grade": grade, "reason": "Uzasadnienie oparte na źródle.",
                        "excerpt": EXCERPT, "source_url": source.url}
                  for name, _, _ in rubric} for key, rubric in RUBRICS.items()}


@pytest.mark.parametrize("grade", [True, 2.5, -1, 5, None, "3", [], {}])
@pytest.mark.django_db
def test_invalid_grades_are_unknown_not_zero(innovation, grade):
    source = innovation.sources.get()
    raw = quality(source)["innovativeness"]
    raw["difference"]["grade"] = grade
    result = validate_dimension("innovativeness", raw, [source])
    assert result["status"] == "unknown"
    assert result["score"] is None
    assert result["criteria"][0]["grade"] is None


@pytest.mark.django_db
def test_weighted_rubric_zero_unknown_and_unsupported_quotes(innovation):
    source = innovation.sources.get()
    raw = quality(source, 0)["innovativeness"]
    assert validate_dimension("innovativeness", raw, [source])["score"] == 0
    raw["difference"]["grade"] = 4
    raw["improvement"]["grade"] = 2
    raw["validation"]["grade"] = 1
    assert validate_dimension("innovativeness", raw, [source])["score"] == 65
    raw["difference"]["excerpt"] = "Nieistniejące wyniki badania o przewadze technologicznej."
    assert validate_dimension("innovativeness", raw, [source])["score"] is None
    raw["difference"]["excerpt"] = EXCERPT
    raw["difference"]["source_url"] = "https://unprovided.example.org"
    assert validate_dimension("innovativeness", raw, [source])["score"] is None
    assert validate_dimension("innovativeness", [], [source])["score"] is None


@pytest.mark.parametrize("url", ["http://127.0.0.1/a", "http://localhost/a",
                                     "https://10.0.0.1/a", "file:///tmp/a", "bad"])
def test_nonpublic_source_is_not_assessment_material(url):
    assert not public_source_url(url)


@pytest.mark.django_db
def test_import_uses_same_extraction_call_and_invalidates_on_source_change(settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    calls = []
    url = "https://science.example.org/automatic"

    def response(prompt, **kwargs):
        calls.append(prompt)
        payload = quality(type("Source", (), {"url": url})()) if len(calls) == 1 else {}
        return {"quality_assessment": payload}

    monkeypatch.setattr("apps.ingestion.ai_service.call_gemini_json", response)
    record = RawSourceRecord(title="Metoda innowacji", text=MATERIAL, url=url,
                             registry="Uczelnia", label="Badanie")
    inv, outcome = ingest_raw_record(record)
    assert outcome == "created" and len(calls) == 1
    assert inv.scores == {"innovativeness": 75, "application_potential": 75, "credibility": 55}
    assert inv.verification_status == "pending_review"
    original = inv.assessment["assessed_at"]
    inv, outcome = ingest_raw_record(record)
    assert outcome == "unchanged" and len(calls) == 1
    assert inv.assessment["assessed_at"] == original
    record.text = "Zmiana: brak danych porównawczych. Prototyp nowego narzędzia."
    inv, outcome = ingest_raw_record(record)
    assert outcome == "updated" and len(calls) == 2
    assert inv.deployment_level == "prototype"
    assert "innovativeness" not in inv.scores and "application_potential" not in inv.scores
    assert inv.evidences.exclude(assessment_key="").count() == 3


@pytest.mark.django_db
def test_credibility_does_not_count_generated_or_duplicate_evidence(innovation):
    source = innovation.sources.get()
    assert innovation.scores == {"credibility": 55}
    assert not assess_innovation(innovation)
    # AI and generic keyword descriptions do not independently confirm their own conclusions.
    Evidence.objects.create(innovation=innovation, source=source, kind="ai_estimate",
                            text_pl=EXCERPT, text_en=EXCERPT)
    Evidence.objects.create(innovation=innovation, source=source, kind="source_declaration",
                            text_pl="Wykryto informację o przeprowadzonym pilotażu.", text_en="")
    assess_innovation(innovation)
    assert innovation.scores["credibility"] == 55
    for _ in range(2):
        Evidence.objects.create(innovation=innovation, source=source, kind="source_declaration",
                                text_pl=EXCERPT, text_en="")
    assess_innovation(innovation)
    assert innovation.scores["credibility"] == 70
    Evidence.objects.create(innovation=innovation, source=source, kind="verified_fact",
                            text_pl=EXCERPT, text_en="")
    innovation.verification_status = "verified"
    innovation.save()
    assess_innovation(innovation)
    assert innovation.scores["credibility"] == 100
    innovation.verification_status = "conflict"
    innovation.conflicting_info = ["Różne wyniki źródłowe"]
    innovation.save()
    assess_innovation(innovation)
    assert innovation.scores["credibility"] == 65
    assert innovation.evidences.exclude(assessment_key="").count() == 3


@pytest.mark.django_db
def test_freshness_changes_recompute_without_ai_and_keep_qualitative(innovation, monkeypatch):
    source = innovation.sources.get()
    assess_innovation(innovation, qualitative=quality(source))
    monkeypatch.setattr("apps.innovations.assessment.call_gemini_json",
                        lambda *a, **kw: pytest.fail("No redundant AI call"))
    for age, expected in [(91, 50), (181, 45), (-1, 40)]:
        source.fetched_at = timezone.localdate() - timedelta(days=age)
        source.save()
        assert assess_innovation(innovation, request_ai=True)
        assert innovation.scores["credibility"] == expected
        assert innovation.scores["innovativeness"] == 75
    source.is_available = False
    source.save()
    assess_innovation(innovation)
    assert innovation.scores["credibility"] == 40
    source.raw_snapshot = ""
    source.save()
    assess_innovation(innovation)
    assert innovation.scores == {}


@pytest.mark.django_db
def test_metadata_and_exports_are_public_and_comparison_uses_three_dimensions(innovation):
    source = innovation.sources.get()
    assess_innovation(innovation, qualitative=quality(source, 0))
    second, _ = ingest_raw_record(RawSourceRecord(
        title="Inna metoda", text=MATERIAL, url="https://science.example.org/other",
        registry="Uczelnia", label="Inne badanie",
    ))
    assess_innovation(second, qualitative=quality(second.sources.get(), 4))
    client = APIClient()
    data = client.get(f"/api/innovations/{innovation.slug}/").data
    assert data["assessment"]["dimensions"]["innovativeness"]["score"] == 0
    assert data["assessment"]["dimensions"]["credibility"]["method"] == "system_calculation"
    assert "contact_info" not in data
    comparison = client.post("/api/discovery/compare/", {
        "innovation_slugs": [innovation.slug, second.slug],
    }, format="json")
    assert comparison.status_code == 200
    assert comparison.data["highlights"]["strongest_overall"] == second.slug
    assert "transferability" not in comparison.data["score_leaders"]
    for fmt in ("json", "md", "csv"):
        response = client.get(f"/api/innovations/{innovation.slug}/export/?export_format={fmt}")
        assert response.status_code == 200
        text = json.dumps(response.data) if fmt == "json" else response.content.decode()
        assert "innovativeness" in text and "quality-v1" in text
        assert "contact_info" not in text
    for fmt in ("md", "csv"):
        response = client.post("/api/comparisons/export/", {
            "innovation_slugs": [innovation.slug, second.slug], "export_format": fmt,
        }, format="json")
        assert response.status_code == 200 and b"quality-v1" in response.content


@pytest.mark.django_db
def test_admin_verification_and_merge_reassess_without_moving_generated_evidence(innovation):
    source = innovation.sources.get()
    assess_innovation(innovation, qualitative=quality(source))
    user = get_user_model().objects.create_user(username="operator", is_staff=True)
    client = APIClient()
    client.force_authenticate(user)
    response = client.patch(f"/api/admin/innovations/{innovation.slug}/", {
        "verification_status": "verified",
    }, format="json")
    assert response.status_code == 200
    innovation.refresh_from_db()
    assert innovation.scores["credibility"] == 75
    assert innovation.scores["innovativeness"] == 75
    duplicate, _ = ingest_raw_record(RawSourceRecord(
        title="Duplikat badania", text=MATERIAL, url="https://science.example.org/mirror",
        registry="Uczelnia", label="Badanie",
    ))
    response = client.post(f"/api/admin/innovations/{duplicate.slug}/merge-duplicate/", {
        "target_slug": innovation.slug,
    }, format="json")
    assert response.status_code == 200
    innovation.refresh_from_db()
    assert innovation.sources.count() == 2
    assert innovation.evidences.exclude(assessment_key="").count() == 3
    assert duplicate.evidences.count() == 0
    # Source-set changes invalidate qualitative claims until reassessed against the new set.
    assert "innovativeness" not in innovation.scores


@pytest.mark.django_db
def test_backfill_dry_run_retry_and_cache_preserve_data(innovation, settings, monkeypatch):
    source = innovation.sources.get()
    settings.GEMINI_API_KEY = "test-key"
    calls = []

    def ai(prompt, **kwargs):
        calls.append(prompt)
        return {"quality_assessment": quality(source)}

    monkeypatch.setattr("apps.innovations.assessment.call_gemini_json", ai)
    original = copy.deepcopy(innovation.assessment)
    output = io.StringIO()
    call_command("assess_innovations", "--limit=1", "--dry-run", stdout=output)
    innovation.refresh_from_db()
    assert innovation.assessment == original and calls == []
    assert "no writes or AI requests" in output.getvalue()
    call_command("assess_innovations", "--limit=1", "--retry-unknown")
    innovation.refresh_from_db()
    assert innovation.scores["innovativeness"] == 75 and len(calls) == 1
    call_command("assess_innovations", "--limit=1", "--retry-unknown")
    assert len(calls) == 1
    assert innovation.evidences.exclude(assessment_key="").count() == 3
    # Malformed response and missing key leave unknown scores without blocking persistence.
    source.raw_snapshot += " Nowa treść źródła."
    source.save()
    monkeypatch.setattr("apps.innovations.assessment.call_gemini_json", lambda *a, **kw: None)
    call_command("assess_innovations", "--limit=1", "--retry-unknown")
    innovation.refresh_from_db()
    assert innovation.scores == {"credibility": 55}
    assert innovation.verification_status == "pending_review"
    assert Innovation.objects.count() == InnovationSource.objects.count() == 1
    for flag in ("--limit=0", "--limit=101"):
        with pytest.raises(CommandError):
            call_command("assess_innovations", flag)


@pytest.mark.django_db
def test_backfill_never_assesses_synthetic_or_merged(innovation, monkeypatch):
    innovation.is_synthetic_demo = True
    innovation.save()
    monkeypatch.setattr("apps.innovations.assessment.call_gemini_json",
                        lambda *a, **kw: pytest.fail("No fixture AI calls"))
    out = io.StringIO()
    call_command("assess_innovations", "--limit=100", stdout=out)
    assert "Records: 0" in out.getvalue()
    innovation.is_synthetic_demo = False
    innovation.is_merged = True
    innovation.save()
    out = io.StringIO()
    call_command("assess_innovations", "--limit=100", stdout=out)
    assert "Records: 0" in out.getvalue()


@pytest.mark.django_db
def test_retry_unknown_preserves_completed_dimension_and_unrelated_scores(
    innovation, settings, monkeypatch,
):
    source = innovation.sources.get()
    partial = quality(source, 2)
    partial["innovativeness"] = {}
    innovation.scores["transferability"] = 81
    innovation.save()
    assess_innovation(innovation, qualitative=partial)
    assert innovation.scores["application_potential"] == 50
    settings.GEMINI_API_KEY = "test-key"
    monkeypatch.setattr("apps.innovations.assessment.call_gemini_json",
                        lambda *a, **kw: {"quality_assessment": quality(source, 4)})
    assess_innovation(innovation, request_ai=True, retry_unknown=True)
    assert innovation.scores == {
        "innovativeness": 100, "application_potential": 50, "credibility": 55,
        "transferability": 81,
    }


@pytest.mark.django_db(transaction=True)
def test_parallel_backfill_uses_separate_connections_under_import_lock(
    innovation, settings, monkeypatch,
):
    source = innovation.sources.get()
    settings.GEMINI_API_KEY = "test-key"

    def ai(prompt, **kwargs):
        # Main command's lock must survive worker connection cleanup and exclude imports.
        with pytest.raises(IngestionBusyError), ingestion_lock():
            pass
        return {"quality_assessment": quality(source)}

    monkeypatch.setattr("apps.innovations.assessment.call_gemini_json", ai)
    call_command("assess_innovations", "--limit=1", "--workers=2", "--retry-unknown")
    innovation.refresh_from_db()
    assert innovation.scores["innovativeness"] == 75
