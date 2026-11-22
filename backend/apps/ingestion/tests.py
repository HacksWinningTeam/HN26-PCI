import io
import json
import urllib.error
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from pypdf import PdfWriter
from rest_framework.test import APIClient

from apps.ingestion.adapters import (
    FeedBatch,
    fetch_feed_batch,
    fetch_feed_records,
    parse_api_payload,
    parse_html_document,
    parse_pdf_document,
)
from apps.ingestion.ai_service import extract_and_classify_innovation
from apps.ingestion.default_feeds import DEFAULT_FEEDS, configure_default_feeds
from apps.ingestion.models import IngestionRun, InnovationAuditLog, SourceFeed
from apps.ingestion.pipeline import ingest_raw_record, mark_stale_innovations
from apps.innovations.models import Innovation, InnovationSource


def _pci_client():
    user, _ = get_user_model().objects.get_or_create(
        username="ingestion-test-operator", defaults={"is_staff": True},
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


def _mock_batch(monkeypatch, items, feed):
    records = parse_api_payload(
        json.dumps(items).encode(), content_type="application/json", base_url=feed.url,
        registry=feed.name.split("—")[0].strip(), label=feed.name,
    )
    monkeypatch.setattr(
        "apps.ingestion.pipeline.fetch_feed_batch", lambda **kwargs: FeedBatch(records, {}),
    )


class _FakeHTTPResponse:
    def __init__(self, body: dict | bytes | str, content_type: str = "application/json") -> None:
        if isinstance(body, bytes):
            self._body = body
        elif isinstance(body, str):
            self._body = body.encode("utf-8")
        else:
            self._body = json.dumps(body).encode("utf-8")
        self.headers = {"Content-Type": content_type}

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
        "apps.core.gemini.urllib.request.urlopen",
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

    monkeypatch.setattr("apps.core.gemini.urllib.request.urlopen", _fail_urlopen)
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
    items = [
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
    _mock_batch(monkeypatch, items, feed)

    client = _pci_client()
    run_res = client.post("/api/admin/ingestion/run/", {"feed_ids": [feed.id]}, format="json")
    assert run_res.status_code == 201
    assert run_res.data["new_records"] == 2
    assert run_res.data["errors_count"] == 0

    smartbus = Innovation.objects.get(title_pl__startswith="SmartBus Podkarpacie")
    assert smartbus.verification_status == "pending_review"
    assert smartbus.scores == {"credibility": 55}
    assert smartbus.assessment["dimensions"]["innovativeness"]["status"] == "unknown"
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

    monkeypatch.setattr("apps.ingestion.pipeline.fetch_feed_batch", fetch_feed_batch)
    monkeypatch.setattr("apps.ingestion.adapters.urllib.request.urlopen", _net_err)
    out = io.StringIO()
    call_command("run_ingestion", "--live", f"--feed-id={feed.id}", stdout=out)
    feed.refresh_from_db()
    assert feed.status == "error"
    assert "connection refused" in feed.error_message
    assert IngestionRun.objects.exists()


@pytest.mark.django_db
def test_phase_e_admin_manual_import_reject_merge_history_and_scoring_config():
    call_command("seed_demo")
    client = _pci_client()

    # 1. Manual verified import + potential duplicate check
    create_res = client.post(
        "/api/admin/innovations/",
        {
            "title_pl": "Asystent Obywatela — Formularze Gminne",
            "short_summary_pl": "Proste formularze wniosków dla mieszkańców gmin.",
            "problem_pl": "Składanie wniosków w urzędzie wymaga wsparcia.",
            "solution_pl": "Kreator krok po kroku dostępny w przeglądarce.",
            "primary_area": "administrative",
            "sectors": ["administracja"],
            "beneficiary_groups": ["seniors_60_plus"],
            "organization_name": "Gmina Krosno",
            "organization_type": "public_institution",
            "origin_location": "Krosno, Podkarpackie",
            "deployment_level": "pilot",
            "source_url": "https://krosno.pl/asystent",
        },
        format="json",
    )
    assert create_res.status_code == 201
    new_slug = create_res.data["innovation"]["slug"]
    assert create_res.data["innovation"]["verification_status"] == "verified"

    # History endpoint lists creation entry
    hist = client.get(f"/api/admin/innovations/{new_slug}/history/")
    assert hist.status_code == 200
    assert len(hist.data) >= 1

    # 2. Reject hides record from public catalog & writes reject audit log
    rej = client.post(
        f"/api/admin/innovations/{new_slug}/reject/",
        {"reason": "Duplikat merytoryczny"},
        format="json",
    )
    assert rej.status_code == 200
    assert rej.data["is_public"] is False
    assert client.get(f"/api/innovations/{new_slug}/").status_code == 404

    hist_after_rej = client.get(f"/api/admin/innovations/{new_slug}/history/")
    assert hist_after_rej.data[0]["action"] == "reject"

    # 3. Merge any two records via explicit target_slug
    merge_res = client.post(
        f"/api/admin/innovations/{new_slug}/merge-duplicate/",
        {"target_slug": "e-urzad-senior"},
        format="json",
    )
    assert merge_res.status_code == 200
    assert merge_res.data["target_slug"] == "e-urzad-senior"
    assert Innovation.objects.get(slug=new_slug).is_merged is True

    # 4. ScoringConfig GET/PATCH validates sum == 100 and versions config
    cfg_get = client.get("/api/admin/scoring-config/")
    assert cfg_get.status_code == 200
    assert cfg_get.data["active"]["version"] == "v1.0"

    bad_cfg = client.patch(
        "/api/admin/scoring-config/",
        {"problem_weight": 80, "sector_weight": 20, "beneficiary_weight": 20},
        format="json",
    )
    assert bad_cfg.status_code == 400

    good_cfg = client.patch(
        "/api/admin/scoring-config/",
        {
            "version": "v2.0",
            "problem_weight": 50,
            "sector_weight": 20,
            "beneficiary_weight": 20,
            "organization_fit_weight": 10,
        },
        format="json",
    )
    assert good_cfg.status_code == 200
    assert good_cfg.data["active"]["version"] == "v2.0"
    assert len(good_cfg.data["versions"]) >= 2


def _build_test_pdf_bytes(title: str = "Raport pilotażu SmartGmina") -> bytes:
    """Create a valid single-page PDF with extractable text in memory."""
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

    writer = PdfWriter()
    page = writer.add_blank_page(width=200, height=200)
    writer.add_metadata({"/Title": title})

    stream = DecodedStreamObject()
    stream.set_data(
        b"BT /F1 12 Tf 10 100 Td "
        b"(Pilotaz czujnikow jakosci powietrza w gminie Rzeszow TRL 6.) Tj ET"
    )
    page[NameObject("/Contents")] = writer._add_object(stream)
    font_dict = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font_dict)})}
    )
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_phase_f_adapters_cordis_oai_pmh_danegov_openalex_pdf_and_antibot():
    # 1. CORDIS JSON
    cordis_payload = {
        "hits": {
            "hit": [
                {
                    "project": {
                        "id": "101129698",
                        "acronym": "PROMATAI",
                        "title": "Hybrid material processing with AI",
                        "teaser": "Industrial pilot for composite manufacturing.",
                        "objective": "Developed in Poland for SMEs at TRL 6.",
                        "status": "SIGNED",
                    }
                }
            ]
        }
    }
    cordis_recs = parse_api_payload(
        json.dumps(cordis_payload).encode("utf-8"),
        content_type="application/json",
        base_url="https://cordis.europa.eu/search",
        registry="CORDIS",
        label="CORDIS",
    )
    assert len(cordis_recs) == 1
    assert cordis_recs[0].url == "https://cordis.europa.eu/project/id/101129698"
    assert "PROMATAI" in cordis_recs[0].title

    # 2. Dane.gov.pl JSON:API
    dane_payload = {
        "data": [
            {
                "id": "280",
                "attributes": {
                    "title": "Akredytowane Ośrodki Innowacji",
                    "notes": "<p>Rejestr ośrodków wspierających transfer technologii.</p>",
                    "institution_title": "Ministerstwo Rozwoju",
                },
                "links": {"self": "https://api.dane.gov.pl/1.4/datasets/280"},
            }
        ]
    }
    dane_recs = parse_api_payload(
        json.dumps(dane_payload).encode("utf-8"),
        content_type="application/vnd.api+json",
        base_url="https://api.dane.gov.pl/1.4/datasets",
        registry="Dane.gov.pl",
        label="Dane.gov.pl",
    )
    assert len(dane_recs) == 1
    assert "<p>" not in dane_recs[0].text
    assert dane_recs[0].organization_name == "Ministerstwo Rozwoju"

    # 3. OpenAlex JSON with inverted abstract
    openalex_payload = {
        "results": [
            {
                "id": "https://openalex.org/W1",
                "title": "IoT Water Sensor",
                "abstract_inverted_index": {"Sensor": [0], "measures": [1], "flood": [2]},
                "authorships": [{"institutions": [{"display_name": "Politechnika Gdańska"}]}],
                "primary_location": {"landing_page_url": "https://pg.edu.pl/iot"},
            }
        ]
    }
    oa_recs = parse_api_payload(
        json.dumps(openalex_payload).encode("utf-8"),
        content_type="application/json",
        base_url="https://api.openalex.org/works",
        registry="OpenAlex",
        label="OpenAlex",
    )
    assert len(oa_recs) == 1
    assert oa_recs[0].text == "Sensor measures flood"
    assert oa_recs[0].organization_name == "Politechnika Gdańska"

    # 4. OAI-PMH XML (oai_dc)
    oai_xml = (
        b'<?xml version="1.0" encoding="UTF-8"?>'
        b'<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">'
        b"<ListRecords><record><header><identifier>oai:ruj:1</identifier></header>"
        b'<metadata><oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" '
        b'xmlns:dc="http://purl.org/dc/elements/1.1/">'
        b"<dc:title>Algorytm detekcji mowy</dc:title>"
        b"<dc:description>Narz\xc4\x99dzie wsparcia terapii logopedycznej.</dc:description>"
        b"<dc:publisher>Uniwersytet Jagiello\xc5\x84ski</dc:publisher>"
        b"<dc:identifier>https://ruj.uj.edu.pl/item/1</dc:identifier>"
        b"</oai_dc:dc></metadata></record></ListRecords></OAI-PMH>"
    )
    oai_recs = parse_api_payload(
        oai_xml,
        content_type="text/xml",
        base_url="https://ruj.uj.edu.pl/server/oai/request",
        registry="RUJ UJ",
        label="RUJ",
    )
    assert len(oai_recs) == 1
    assert oai_recs[0].url == "https://ruj.uj.edu.pl/item/1"
    assert oai_recs[0].organization_name == "Uniwersytet Jagielloński"

    # 5. PDF parsing via pypdf
    pdf_bytes = _build_test_pdf_bytes()
    pdf_rec = parse_pdf_document(
        pdf_bytes,
        url="https://example.pl/raport.pdf",
        registry="Raport JST",
        label="Raport",
    )
    assert pdf_rec.title == "Raport pilotażu SmartGmina"
    assert "Rzeszow" in pdf_rec.text
    assert pdf_rec.metadata["document_format"] == "pdf"

    # 6. Anti-bot / CAPTCHA pages are rejected cleanly rather than bypassed
    with pytest.raises(ValueError, match="CAPTCHA"):
        parse_html_document(
            "<html><title>High Load - Verifying Browser</title></html>",
            url="https://blocked.pl",
            registry="Blocked",
            label="Blocked",
        )


@pytest.mark.django_db
def test_phase_f_scrape_url_pdf_and_source_feed_crud(settings, monkeypatch):
    settings.GEMINI_API_KEY = ""
    call_command("seed_demo")
    client = _pci_client()

    # 1. SourceFeed CRUD
    list_res = client.get("/api/admin/source-feeds/")
    assert list_res.status_code == 200
    assert len(list_res.data) >= 4

    create_feed = client.post(
        "/api/admin/source-feeds/",
        {
            "name": "Politechnika Rzeszowska — Repozytorium",
            "category": "Nauka i patenty",
            "url": "https://example.edu.pl/oai",
            "method": "OAI-PMH",
            "config": {"live_fetch": True, "max_records": 2},
        },
        format="json",
    )
    assert create_feed.status_code == 201
    feed_id = create_feed.data["id"]
    assert create_feed.data["config"]["max_records"] == 2

    patch_feed = client.patch(
        f"/api/admin/source-feeds/{feed_id}/",
        {"status": "stale", "config": {"live_fetch": False, "max_records": 4}},
        format="json",
    )
    assert patch_feed.status_code == 200
    assert patch_feed.data["status"] == "stale"
    assert patch_feed.data["config"]["max_records"] == 4

    # 2. Scrape PDF URL on demand
    pdf_bytes = _build_test_pdf_bytes("Czujniki Powietrza Rzeszów")
    monkeypatch.setattr(
        "apps.ingestion.adapters.urllib.request.urlopen",
        lambda req, timeout=15: _FakeHTTPResponse(pdf_bytes, content_type="application/pdf"),
    )
    scrape_pdf = client.post(
        "/api/admin/ingestion/scrape-url/",
        {
            "url": "https://rzeszow.pl/raport-powietrze.pdf",
            "registry": "BIP Rzeszów",
            "organization_name": "Gmina Miasto Rzeszów",
        },
        format="json",
    )
    assert scrape_pdf.status_code == 201
    assert scrape_pdf.data["created_count"] == 1
    slug = scrape_pdf.data["results"][0]["innovation"]["slug"]
    assert scrape_pdf.data["results"][0]["innovation"]["verification_status"] == "pending_review"
    inv = Innovation.objects.get(slug=slug)
    assert inv.sources.first().content_hash
    assert "Rzeszow" in inv.sources.first().raw_snapshot

    # 3. Scrape duplicate HTML URL detects existing innovation
    html_dup = (
        "<html><head><title>Czujniki Powietrza Rzeszów</title></head>"
        "<body><p>System pomiaru jakości powietrza w gminie Rzeszów, TRL 6.</p></body></html>"
    )
    monkeypatch.setattr(
        "apps.ingestion.adapters.urllib.request.urlopen",
        lambda req, timeout=15: _FakeHTTPResponse(html_dup, content_type="text/html"),
    )
    scrape_dup = client.post(
        "/api/admin/ingestion/scrape-url/",
        {
            "url": "https://rzeszow.pl/aktualnosci/czujniki",
            "organization_name": "Gmina Miasto Rzeszów",
        },
        format="json",
    )
    assert scrape_dup.status_code == 201
    assert scrape_dup.data["duplicate_count"] == 1
    assert scrape_dup.data["results"][0]["potential_duplicate_slug"] == slug

    # 4. Anti-bot URL returns 400 and network error returns 502
    monkeypatch.setattr(
        "apps.ingestion.adapters.urllib.request.urlopen",
        lambda req, timeout=15: _FakeHTTPResponse(
            "<html><title>Checking your browser before accessing</title></html>",
            content_type="text/html",
        ),
    )
    blocked_res = client.post(
        "/api/admin/ingestion/scrape-url/",
        {"url": "https://example.pl/protected"},
        format="json",
    )
    assert blocked_res.status_code == 400

    # Clean up custom feed
    del_res = client.delete(f"/api/admin/source-feeds/{feed_id}/")
    assert del_res.status_code == 204
    assert fetch_feed_records.__name__ == "fetch_feed_records"


@pytest.mark.django_db
def test_phase_f_relevance_filter_skips_non_innovation_records(settings, monkeypatch):
    settings.GEMINI_API_KEY = "test-key"
    call_command("seed_demo")
    feed = SourceFeed.objects.filter(status="active").first()
    assert feed is not None
    initial_count = feed.local_records_count
    items = [
            {
                "title": "Wodowanie airbusa na rzece Hudson w Nowym Jorku",
                "text": "Historyczna analiza lądowania awaryjnego samolotu pasażerskiego.",
                "url": "https://ruj.uj.edu.pl/item/hudson-airbus",
                "registry": "RUJ UJ",
            },
            {
                "title": "System wczesnego ostrzegania dla małych gmin",
                "text": "Nowy prototyp czujników zalania i powiadomień SMS dla sołtysów.",
                "url": "https://ruj.uj.edu.pl/item/gmina-alert",
                "registry": "RUJ UJ",
            },
    ]
    _mock_batch(monkeypatch, items, feed)

    def _mock_gemini(prompt: str, *, temperature: float = 0.2):
        if "Hudson" in prompt:
            return {
                "is_relevant_innovation": False,
                "relevance_reason": "Artykuł historyczno-lotniczy, nie dotyczy innowacji.",
            }
        return {
            "is_relevant_innovation": True,
            "relevance_reason": "Prototyp systemu ostrzegania dla samorządów.",
            "short_summary_pl": "System powiadomień powodziowych dla gmin.",
            "problem_pl": "Brak wczesnych alertów.",
            "solution_pl": "Czujniki + SMS.",
            "primary_area": "technological",
            "innovation_character": ["product"],
            "sectors": ["administracja"],
            "beneficiary_groups": ["public_orgs_communities"],
            "deployment_level": "prototype",
            "trl": 4,
            "missing_info": [],
            "oslo_novelty": "Nowe rozwiązanie dla gmin.",
        }

    monkeypatch.setattr("apps.ingestion.ai_service.call_gemini_json", _mock_gemini)

    client = _pci_client()
    res = client.post(
        "/api/admin/ingestion/run/",
        {"feed_ids": [feed.id], "live_fetch": True},
        format="json",
    )
    assert res.status_code == 201
    assert res.data["new_records"] == 1
    assert "pominięte (nieinnowacje): 1" in res.data["summary"]
    assert not Innovation.objects.filter(sources__url="https://ruj.uj.edu.pl/item/hudson-airbus").exists()
    assert Innovation.objects.filter(sources__url="https://ruj.uj.edu.pl/item/gmina-alert").exists()
    feed.refresh_from_db()
    assert feed.local_records_count == initial_count + 1


@pytest.mark.django_db
def test_real_default_feeds_preserve_custom_sources_and_seed_no_fake_failures():
    custom = SourceFeed.objects.create(
        name="Własne źródło", category="Nauka", url="https://example.org/rss",
        method="RSS", last_synced_at=timezone.now(), config={"max_records": 7},
    )
    for name, url in (
        ("NCN — Baza Projektów", "https://projekty.ncn.gov.pl/"),
        ("Samorządy, Szkoły, CTT & Startupy", "https://samorzad.gov.pl/"),
    ):
        SourceFeed.objects.create(
            name=name, url=url, category="Demo", method="Web Crawl",
            status="error", records_count=263, last_synced_at=timezone.now(),
        )
    call_command("seed_demo")
    ids = dict(SourceFeed.objects.values_list("name", "id"))
    call_command("seed_demo")
    assert dict(SourceFeed.objects.values_list("name", "id")) == ids
    custom.refresh_from_db()
    assert custom.config == {"max_records": 7}
    assert SourceFeed.objects.count() == len(DEFAULT_FEEDS) + 1
    assert not SourceFeed.objects.filter(status__in=["error", "stale"]).exists()
    assert not IngestionRun.objects.exists()
    for spec in DEFAULT_FEEDS:
        feed = SourceFeed.objects.get(name=spec["name"])
        assert feed.config["max_records"] == 10
        assert feed.records_count == feed.local_records_count
    assert "num=10" in SourceFeed.objects.get(name__startswith="CORDIS").url
    assert "per-page=10" in SourceFeed.objects.get(name__startswith="OpenAlex").url


@pytest.mark.django_db
def test_source_counts_are_distinct_local_and_follow_merge_delete_and_feed_rename():
    call_command("seed_demo")
    client = _pci_client()
    res = client.post(
        "/api/admin/source-feeds/",
        {"name": "Nowy kanał", "category": "Nauka", "url": "https://example.org/feed",
         "method": "RSS", "records_count": 999}, format="json",
    )
    assert res.status_code == 201
    assert res.data["records_count"] == 0
    feed = SourceFeed.objects.get(pk=res.data["id"])
    feed.records_count = 999
    feed.save()
    target = Innovation.objects.get(slug="e-urzad-senior")
    duplicate = Innovation.objects.get(slug="aqua-guard-gdynia-dup")
    first = target.sources.first()
    second = InnovationSource.objects.create(
        innovation=target, label="Drugie źródło", registry="Nowy kanał",
        url="https://example.org/other", fetched_at=timezone.localdate(),
        last_verified_at=timezone.localdate(),
    )
    feed.sources.add(first, second, *duplicate.sources.all())
    feed.name = "Zmieniona nazwa"
    feed.save()

    def counts():
        listing = client.get("/api/admin/source-feeds/")
        quality = client.get("/api/admin/innovations/")
        detail = client.get(f"/api/admin/source-feeds/{feed.id}/")
        assert listing.status_code == quality.status_code == detail.status_code == 200
        return [
            next(f for f in listing.data if f["id"] == feed.id)["records_count"],
            next(f for f in quality.data["source_feeds"] if f["id"] == feed.id)["records_count"],
            detail.data["records_count"],
        ]

    assert counts() == [2, 2, 2]  # Three citations represent two local innovations.
    merge = client.post(
        f"/api/admin/innovations/{duplicate.slug}/merge-duplicate/",
        {"target_slug": target.slug}, format="json",
    )
    assert merge.status_code == 200
    assert counts() == [1, 1, 1]
    target.delete()
    assert counts() == [0, 0, 0]


@pytest.mark.django_db
def test_repeat_live_refresh_uses_ten_candidates_and_never_inflates_counts(settings, monkeypatch):
    settings.GEMINI_API_KEY = ""
    feed = SourceFeed.objects.create(
        name="Test kanału", url="https://example.org/feed", category="Nauka", method="RSS",
        last_synced_at=timezone.now(), records_count=312,
    )
    records = parse_api_payload(
        json.dumps([
            {"title": f"Prototyp czujnika {n}", "description": f"System pomiaru TRL {n % 8 + 1}",
             "url": f"https://example.org/project/{n}"}
            for n in range(10)
        ]).encode(), content_type="application/json", base_url=feed.url,
        registry=feed.name, label=feed.name,
    )
    calls = []

    def fetch(**kwargs):
        calls.append(kwargs["max_records"])
        return FeedBatch(records, {})

    monkeypatch.setattr("apps.ingestion.pipeline.fetch_feed_batch", fetch)
    client = _pci_client()
    for _ in range(2):
        response = client.post(
            "/api/admin/ingestion/run/", {"feed_ids": [feed.id], "live_fetch": True},
            format="json",
        )
        assert response.status_code == 201
        assert response.data["errors_count"] == 0
        feed.refresh_from_db()
        assert feed.records_count == feed.local_records_count == 10
    assert calls == [10, 10]
    assert response.data["new_records"] == 0
    assert InnovationSource.objects.filter(feeds=feed).count() == 10

    # An already imported URL can belong to a second feed without another innovation.
    other = SourceFeed.objects.create(
        name="Współdzielony kanał", url=feed.url, category="Nauka", method="RSS",
        last_synced_at=timezone.now(), config={"max_records": 10},
    )
    response = client.post(
        "/api/admin/ingestion/run/", {"feed_ids": [other.id], "live_fetch": True},
        format="json",
    )
    assert response.data["new_records"] == 0
    assert other.local_records_count == 10
    feed.delete()
    assert other.local_records_count == 10
    assert InnovationSource.objects.filter(feeds=other).count() == 10


@pytest.mark.django_db
def test_feed_upgrade_backfills_imports_and_preserves_genuine_run_history():
    from importlib import import_module

    from django.apps import apps
    from django.db import connection

    call_command("seed_demo")
    feed = SourceFeed.objects.get(name__startswith="CORDIS")
    source = InnovationSource.objects.create(
        innovation=Innovation.objects.first(), label="Imported before provenance",
        registry="CORDIS", url="https://cordis.europa.eu/project/id/123",
        fetched_at=timezone.localdate(), last_verified_at=timezone.localdate(),
    )
    feed.config = {"max_records": 2, "live_fetch": False}
    feed.records_count = 263
    feed.save()
    fake = IngestionRun.objects.create(
        summary="Zaindeksowano rekordy demo; 1 źródło (NCN) zwróciło HTTP 503."
    )
    real = IngestionRun.objects.create(summary="Rzeczywisty błąd sieci", errors_count=1)
    migration = import_module("apps.ingestion.migrations.0005_real_default_feeds")
    migration.upgrade_feeds(apps, connection.schema_editor())
    feed.refresh_from_db()
    assert feed.config["max_records"] == 10
    assert feed.sources.filter(pk=source.pk).exists()
    assert feed.records_count == feed.local_records_count
    assert not IngestionRun.objects.filter(pk=fake.pk).exists()
    assert IngestionRun.objects.filter(pk=real.pk).exists()
    configure_default_feeds()
    assert feed.sources.filter(pk=source.pk).exists()


@pytest.mark.django_db
def test_genuine_feed_failure_is_isolated_and_stale_innovation_does_not_taint_source(
    settings, monkeypatch,
):
    settings.GEMINI_API_KEY = ""
    call_command("seed_demo")
    Innovation.objects.filter(slug="e-urzad-senior").update(
        verification_status="verified", last_verified_at=timezone.localdate() - timedelta(days=200),
    )
    failed = SourceFeed.objects.create(
        name="Uszkodzony kanał testowy", url="https://broken.example.org/rss", method="RSS",
        category="Administracja i edukacja", last_synced_at=timezone.now(),
    )
    working = SourceFeed.objects.create(
        name="Działający kanał testowy", url="https://working.example.org/rss", method="RSS",
        category="Administracja i edukacja", last_synced_at=timezone.now(),
        status="error", error_message="Poprzednia rzeczywista awaria",
    )

    def fetch(**kwargs):
        if kwargs["url"] == failed.url:
            raise urllib.error.URLError("Real connection error")
        return FeedBatch(parse_api_payload(
            b'[{"title":"Pilot sensor system","url":"https://working.example.org/1"}]',
            content_type="application/json", base_url=working.url,
            registry=working.name, label=working.name,
        ), {})

    monkeypatch.setattr("apps.ingestion.pipeline.fetch_feed_batch", fetch)
    response = _pci_client().post(
        "/api/admin/ingestion/run/",
        {"feed_ids": [failed.id, working.id], "live_fetch": True}, format="json",
    )
    assert response.status_code == 201
    assert response.data["errors_count"] == 1
    assert response.data["new_records"] == 1
    failed.refresh_from_db()
    working.refresh_from_db()
    assert failed.status == "error"
    assert "Real connection error" in failed.error_message
    assert working.status == "active"
    assert working.error_message == ""
    assert working.local_records_count == 1
    assert failed.local_records_count == 0
