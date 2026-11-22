import io
import json
import urllib.error
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ingestion.adapters import parse_api_payload, parse_html_document
from apps.ingestion.ai_service import extract_and_classify_innovation
from apps.ingestion.models import IngestionRun, InnovationAuditLog, SourceFeed
from apps.ingestion.pipeline import ingest_raw_record, mark_stale_innovations
from apps.innovations.models import Innovation


class _FakeHTTPResponse:
    def __init__(self, payload: dict) -> None:
        self._body = json.dumps(payload).encode("utf-8")

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_rule_based_extraction_without_gemini_key(settings):
    settings.GEMINI_API_KEY = ""
    raw = (
        "Politechnika Rzeszowska opracowała prototyp skanera ultradźwiękowego TRL 5 "
        "dla lotnictwa i kompozytów. Zgłoszenie patentowe UPRP P.449999. "
        "Problem: długie przestoje podczas inspekcji. Rozwiązanie: mobilna głowica."
    )
    res = extract_and_classify_innovation(
        raw,
        title_hint="Skaner NDT Rzeszów",
        organization_hint="Politechnika Rzeszowska",
        source_registry="UPRP",
    )
    assert res["ai_used"] is False
    assert res["primary_area"] == "technological"
    assert res["trl"] == 5
    assert res["patent_status"] == "application_filed"
    assert "lotnictwo" in res["sectors"]
    assert res["origin_location"] == "Rzeszów"
    assert res["classification_provenance"]["primary_area"] == "rule_based"


def test_gemini_extraction_and_graceful_fallback(settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-gemini-key"
    settings.GEMINI_MODEL = "gemini-2.5-flash"

    fake_gemini = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "short_summary_pl": "Krótkie streszczenie Gemini dla szkół.",
                                    "problem_pl": "Brak wsparcia dla uczniów ze spektrum.",
                                    "solution_pl": "Aplikacja z planem lekcji i trybem wyciszenia.",
                                    "primary_area": "educational",
                                    "innovation_character": ["product", "social"],
                                    "sectors": ["edukacja", "ICT"],
                                    "beneficiary_groups": ["students_teachers", "children_0_12"],
                                    "deployment_level": "pilot",
                                    "trl": 6,
                                    "missing_info": ["Brak danych o kosztach licencji"],
                                    "oslo_novelty": "Nowe narzędzie wsparcia edukacyjnego.",
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }
    monkeypatch.setattr(
        "apps.ingestion.ai_service.urllib.request.urlopen",
        lambda req, timeout=15: _FakeHTTPResponse(fake_gemini),
    )

    res = extract_and_classify_innovation(
        "Narzędzie edukacyjne dla uczniów w szkołach podstawowych w Krośnie.",
        title_hint="Asystent Klasowy",
        organization_hint="Szkoła Podstawowa nr 2 Krosno",
        source_registry="ORE",
    )
    assert res["ai_used"] is True
    assert res["primary_area"] == "educational"
    assert res["classification_provenance"]["primary_area"] == "ai_suggested"
    assert res["classification_provenance"]["trl"] == "ai_suggested"
    assert any(ev["kind"] == "ai_estimate" for ev in res["evidences"])

    # Network error triggers clean deterministic fallback without raising
    def _fail_urlopen(req, timeout=15):
        raise urllib.error.URLError("timeout")

    monkeypatch.setattr("apps.ingestion.ai_service.urllib.request.urlopen", _fail_urlopen)
    fallback = extract_and_classify_innovation(
        "System wsparcia seniorów w gminie.",
        title_hint="Pomocnik Seniora",
    )
    assert fallback["ai_used"] is False
    assert fallback["primary_area"] == "administrative"


def test_adapters_parse_html_json_and_rss():
    html_rec = parse_html_document(
        "<html><head><title>EkoGmina</title><meta name='description' content='Opis'>"
        "<style>.x{}</style></head><body><script>bad()</script>"
        "<h1>System segregacji</h1><p>Pilotaż w gminie.</p></body></html>",
        url="https://example.pl/eko",
        registry="JST",
        label="EkoGmina",
    )
    assert html_rec.title == "EkoGmina"
    assert "bad()" not in html_rec.text
    assert "Pilotaż w gminie" in html_rec.text

    json_recs = parse_api_payload(
        json.dumps([{"title": "Projekt A", "description": "Opis A", "url": "https://a.pl"}]).encode(),
        content_type="application/json",
        base_url="https://api.pl",
        registry="CORDIS",
        label="CORDIS",
    )
    assert len(json_recs) == 1
    assert json_recs[0].title == "Projekt A"

    rss_xml = (
        b"<rss><channel><item><title>Grant B</title>"
        b"<description>Opis B</description><link>https://b.pl</link></item></channel></rss>"
    )
    rss_recs = parse_api_payload(
        rss_xml,
        content_type="application/xml",
        base_url="https://rss.pl",
        registry="NCBR",
        label="NCBR",
    )
    assert len(rss_recs) == 1
    assert rss_recs[0].url == "https://b.pl"


@pytest.mark.django_db
def test_ingestion_pipeline_dedup_change_conflict_stale_and_error(settings, monkeypatch):
    settings.GEMINI_API_KEY = ""
    call_command("seed_demo")

    feed = SourceFeed.objects.filter(status="active").first()
    assert feed is not None
    feed.config = {
        "sample_items": [
            {
                "title": "SmartBus Podkarpacie — Inteligentne Przystanki dla Seniorów",
                "text": (
                    "System głosowych tablic przystankowych dla seniorów w Rzeszowie. "
                    "Rozwiązanie przetestowane w pilotażu na poziomie TRL 7."
                ),
                "url": "https://example.gov.pl/smartbus",
                "registry": "Fundusze Europejskie",
                "organization_name": "Zarząd Transportu Rzeszów",
            },
            {
                "title": "AquaGuard Gdynia — Czujniki Podtopień i Alerty Kryzysowe",
                "text": "Czujniki podtopień dla gmin z Gdyni, prototyp TRL 8.",
                "url": "https://example.gov.pl/aquaguard-mirror",
                "registry": "PARP",
                "organization_name": "Zespół Hydro-ICT Uczelni z Gdyni",
            },
        ]
    }
    feed.save()

    client = APIClient()
    run_res = client.post("/api/admin/ingestion/run/", {}, format="json")
    assert run_res.status_code == 201
    assert run_res.data["new_records"] == 2
    assert run_res.data["errors_count"] >= 1  # NCN error feed

    smartbus = Innovation.objects.get(title_pl__startswith="SmartBus Podkarpacie")
    assert smartbus.verification_status == "pending_review"
    assert InnovationAuditLog.objects.filter(innovation=smartbus, action="ingest").exists()

    dup_mirror = Innovation.objects.get(sources__url="https://example.gov.pl/aquaguard-mirror")
    assert dup_mirror.duplicate_of is not None
    assert dup_mirror.duplicate_of.slug == "aqua-guard-gdynia"

    # Re-ingest same URL with changed TRL triggers conflict detection
    changed_rec = parse_api_payload(
        json.dumps(
            [
                {
                    "title": "SmartBus Podkarpacie — Inteligentne Przystanki dla Seniorów",
                    "description": "Zaktualizowany opis wdrożenia dla seniorów w Rzeszowie, TRL 4.",
                    "url": "https://example.gov.pl/smartbus",
                    "organization_name": "Zarząd Transportu Rzeszów",
                }
            ]
        ).encode(),
        content_type="application/json",
        base_url="https://example.gov.pl/smartbus",
        registry="Fundusze Europejskie",
        label="SmartBus",
    )[0]
    updated_inv, outcome = ingest_raw_record(changed_rec)
    assert outcome == "conflict"
    assert updated_inv.verification_status == "conflict"
    assert len(updated_inv.conflicting_info) >= 1

    # Stale sweep flags old verified innovations
    old_date = timezone.localdate() - timedelta(days=200)
    Innovation.objects.filter(slug="e-urzad-senior").update(
        verification_status="verified",
        last_verified_at=old_date,
    )
    stale_count = mark_stale_innovations()
    assert stale_count >= 1
    assert Innovation.objects.get(slug="e-urzad-senior").verification_status == "stale"

    # CLI run_ingestion with live_fetch error updates SourceFeed to error
    def _net_err(req, timeout=10):
        raise urllib.error.URLError("connection refused")

    monkeypatch.setattr("apps.ingestion.adapters.urllib.request.urlopen", _net_err)
    out = io.StringIO()
    call_command("run_ingestion", "--live", f"--feed-id={feed.id}", stdout=out)
    feed.refresh_from_db()
    assert feed.status == "error"
    assert "connection refused" in feed.error_message
    assert IngestionRun.objects.exists()
