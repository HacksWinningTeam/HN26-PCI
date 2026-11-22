import importlib
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest
from django.apps import apps
from django.utils import timezone
from rest_framework.test import APIClient

from apps.innovations.models import Innovation

from .adapters import RawSourceRecord, fetch_feed_batch
from .catalogues import CTT_DETAIL_PATH, IBE_DOCUMENT_PATH, discover_catalogue_links
from .models import SourceFeed
from .pipeline import run_ingestion_pipeline

CTT_URL = "https://www.ctt.uni.lodz.pl/dla-biznesu/oferta-technologiczna"
IBE_URL = "https://www.ibe.edu.pl/pl/dobre-praktyki"


def _ctt_listing(page=1):
    links = "".join(
        f'<a href="{CTT_DETAIL_PATH}?tx_news_pi1%5Bnews%5D={page * 100 + n}">'
        f"Czujnik {page}-{n}</a>" for n in range(3)
    )
    return (links + f'<a href="?tx_news_pi1%5BcurrentPage%5D={page + 1}">następny</a>'
            + '<a href="https://evil.example/offer">External</a>').encode()


def _ctt_detail(trl="IV"):
    return (
        '<html><nav>Navigation school Warsaw</nav><h1 itemprop="headline">Czujnik</h1>'
        f'<div itemprop="description"><p>Poziom TRL: {trl}*</p></div>'
        '<div itemprop="articleBody"><p>Nowy czujnik wykrywa zmiany parametrów. '
        'Prototyp przetestowano w laboratorium.</p></div><footer>Stopka</footer></html>'
    ).encode()


def test_catalogue_links_are_scoped_deduplicated_and_never_import_navigation():
    documents, next_page = discover_catalogue_links(_ctt_listing().decode(), CTT_URL)
    assert len(documents) == 3
    assert documents[0]["title"] == "Czujnik 1-0"
    assert parse_qs(urlparse(next_page).query)["tx_news_pi1[currentPage]"] == ["2"]
    pdf = IBE_DOCUMENT_PATH.replace(" ", "%20") + "mapa.pdf"
    html = (f'<li>Mapa zawodowa (<a href="{pdf}">kliknij i pobierz PDF</a>)</li>'
            f'<li>Duplicate (<a href="{pdf}">PDF</a>)</li>'
            '<a href="/images/raport.pdf">Raport</a>'
            f'<a href="https://evil.example{pdf}">External</a>')
    documents, next_page = discover_catalogue_links(html, IBE_URL)
    assert documents == [{"url": "https://www.ibe.edu.pl" + pdf, "title": "Mapa zawodowa"}]
    assert next_page == ""
    with pytest.raises(ValueError, match="nie zawiera"):
        discover_catalogue_links('<a href="/">Strona główna</a>', IBE_URL)
    with pytest.raises(ValueError, match="CAPTCHA"):
        discover_catalogue_links("cf-browser-verification", CTT_URL)


def test_ctt_pagination_head_revisit_and_explicit_roman_trl(monkeypatch):
    listing_requests = []

    def download(url):
        if urlparse(url).path == CTT_DETAIL_PATH:
            return _ctt_detail(), "text/html"
        listing_requests.append(url)
        page = int(parse_qs(urlparse(url).query).get("tx_news_pi1[currentPage]", ["1"])[0])
        return _ctt_listing(page), "text/html"

    monkeypatch.setattr("apps.ingestion.catalogues._download", download)
    state = {}
    results = []
    for _ in range(7):
        batch = fetch_feed_batch(url=CTT_URL, method="HTML katalog", registry="CTT UŁ",
                                 label="CTT", max_records=2, state=state)
        results.append(batch.records)
        state = batch.next_state
    assert [len(records) for records in results] == [2, 1, 2, 1, 2, 2, 1]
    pages = [parse_qs(urlparse(u).query).get("tx_news_pi1[currentPage]", ["1"])[0]
             for u in listing_requests]
    assert pages == ["1", "1", "2", "2", "3", "1", "3"]
    record = results[0][0]
    assert record.metadata["trl"] == 4
    assert record.organization_name == "Uniwersytet Łódzki"
    assert "Navigation" not in record.text and "Stopka" not in record.text


def test_ibe_discovers_individual_pdfs_and_preserves_school_identity(monkeypatch):
    urls = []
    path = IBE_DOCUMENT_PATH.replace(" ", "%20")
    html = "".join(f'<li>Innowacja {n} (<a href="{path}{n}.pdf">kliknij i pobierz PDF</a>)</li>'
                   for n in range(3))

    def download(url):
        urls.append(url)
        return (html.encode(), "text/html") if url == IBE_URL else (b"%PDF-test", "application/pdf")

    def parse_pdf(raw, **kwargs):
        assert raw == b"%PDF-test"
        return RawSourceRecord(
            title="Generic PDF title", text="Warszawa. Szkoła Szkoła Podstawowa w Kikole "
            "Imię i nazwisko autora Anna. Nowa metoda nauczania.",
            metadata={"document_format": "pdf"}, **kwargs,
        )

    monkeypatch.setattr("apps.ingestion.catalogues._download", download)
    monkeypatch.setattr("apps.ingestion.catalogues.parse_pdf_document", parse_pdf)
    kwargs = dict(url=IBE_URL, method="HTML katalog", registry="IBE", label="IBE", max_records=2)
    first = fetch_feed_batch(**kwargs)
    second = fetch_feed_batch(**kwargs, state=first.next_state)
    assert [r.title for r in first.records + second.records] == [
        "Innowacja 0", "Innowacja 1", "Innowacja 2",
    ]
    record = first.records[0]
    assert record.organization_name == "Szkoła Podstawowa w Kikole"
    assert record.metadata["primary_area"] == "educational"
    assert record.metadata["origin_location"] != "Warszawa"
    assert second.next_state == {}
    assert len(urls) == 5


def test_failed_document_is_reported_and_unsupported_hosts_are_not_downloaded(monkeypatch):
    def download(url):
        if url == CTT_URL:
            return _ctt_listing(), "text/html"
        raise TimeoutError("Document unavailable")

    monkeypatch.setattr("apps.ingestion.catalogues._download", download)
    with pytest.raises(TimeoutError, match="Document"):
        fetch_feed_batch(url=CTT_URL, method="HTML katalog", registry="CTT", label="CTT")
    with pytest.raises(ValueError, match="Nieobsługiwany"):
        fetch_feed_batch(url="http://127.0.0.1/", method="HTML katalog", registry="X", label="X")


@pytest.mark.django_db
def test_configuration_migration_is_idempotent_and_preserves_existing_feeds(monkeypatch):
    migration = importlib.import_module("apps.ingestion.migrations.0008_ctt_school_sources")
    SourceFeed.objects.all().delete()
    existing = SourceFeed.objects.create(
        name="Własny CTT", url=CTT_URL, category="Custom", method="HTML katalog",
        last_synced_at=timezone.now(), config={"live_fetch": False, "max_records": 3},
    )
    migration.add_catalogues(apps, SimpleNamespace(connection=SimpleNamespace(alias="default")))
    migration.add_catalogues(apps, SimpleNamespace(connection=SimpleNamespace(alias="default")))
    existing.refresh_from_db()
    assert SourceFeed.objects.count() == 2
    assert existing.config == {"live_fetch": False, "max_records": 3}
    assert existing.name == "Własny CTT"
    assert not Innovation.objects.exists()


@pytest.mark.django_db
def test_ctt_pipeline_import_is_repeatable_and_api_count_is_real(settings, monkeypatch):
    from django.contrib.auth import get_user_model

    settings.GEMINI_API_KEY = ""
    feed = SourceFeed.objects.create(
        name="CTT UŁ — Test", url=CTT_URL, category="Startupy i biznes", method="HTML katalog",
        config={"max_records": 2}, last_synced_at=timezone.now(),
    )

    def download(url):
        return (_ctt_listing(), "text/html") if url == CTT_URL else (_ctt_detail(), "text/html")

    monkeypatch.setattr("apps.ingestion.catalogues._download", download)
    first = run_ingestion_pipeline(feed_ids=[feed.pk])
    assert first.new_records == 2 and first.errors_count == 0
    feed.harvest_state = {}
    feed.save(update_fields=["harvest_state"])
    second = run_ingestion_pipeline(feed_ids=[feed.pk])
    assert second.new_records == 0 and second.errors_count == 0
    assert feed.local_records_count == 2
    innovation = Innovation.objects.get(sources__url__contains="news%5D=100")
    assert innovation.trl == 4
    assert innovation.classification_provenance["trl"] == "source"
    assert innovation.verification_status == "pending_review"
    assert not innovation.is_synthetic_demo
    client = APIClient()
    operator = get_user_model().objects.create_user(username="operator", is_staff=True)
    client.force_authenticate(operator)
    response = client.get("/api/admin/source-feeds/")
    row = next(item for item in response.data if item["id"] == feed.pk)
    assert row["records_count"] == 2
