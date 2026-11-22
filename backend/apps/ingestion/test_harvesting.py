import io
import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection, connections
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AdopterProfile

from .adapters import FeedBatch, fetch_feed_batch, parse_api_payload
from .locking import IngestionBusyError, ingestion_lock
from .models import SourceFeed
from .pipeline import run_ingestion_pipeline


def _response(payload, content_type="application/json"):
    class Response:
        headers = {"Content-Type": content_type}

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def read(self):
            return payload.encode() if isinstance(payload, str) else json.dumps(payload).encode()
    return Response()


@pytest.mark.parametrize("payload", [{"results": []}, {"data": []}, {"hits": {"hit": []}}])
def test_empty_api_page_is_not_an_innovation(payload):
    assert parse_api_payload(
        json.dumps(payload).encode(), content_type="application/json",
        base_url="https://example.org", registry="Test", label="Test",
    ) == []


def test_openalex_pagination_and_head_refresh_keep_backfill_position(monkeypatch):
    urls = []

    def download(req, timeout=15):
        urls.append(req.full_url)
        page = int(parse_qs(urlparse(req.full_url).query).get("page", ["1"])[0])
        return _response({"results": [
            {"title": f"Innovation {page}-{n}", "url": f"https://example.org/{page}/{n}"}
            for n in range(10)
        ]})

    monkeypatch.setattr("apps.ingestion.adapters.urllib.request.urlopen", download)
    kwargs = dict(url="https://api.openalex.org/works?search=innovation", method="API",
                  registry="OpenAlex", label="OpenAlex", max_records=10)
    state = {}
    for _ in range(7):
        batch = fetch_feed_batch(**kwargs, state=state)
        assert len(batch.records) == 10
        state = batch.next_state
    assert [parse_qs(urlparse(u).query).get("page", ["1"])[0] for u in urls] == [
        "1", "2", "3", "4", "5", "1", "6",
    ]
    assert all(parse_qs(urlparse(u).query)["per_page"] == ["10"] for u in urls)


def test_oai_offsets_use_whole_page_before_exclusive_resumption_token(monkeypatch):
    urls = []

    def download(req, timeout=15):
        urls.append(req.full_url)
        token_request = "resumptionToken=" in req.full_url
        numbers = range(20, 22) if token_request else range(20)
        records = "".join(
            f"<record><metadata><dc:title>Innovation {n}</dc:title>"
            f"<dc:identifier>https://example.org/{n}</dc:identifier></metadata></record>"
            for n in numbers
        )
        token = "" if token_request else "next token+value"
        return _response(
            '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/"><ListRecords>'
            f"{records}<resumptionToken>{token}</resumptionToken></ListRecords></OAI-PMH>",
            "text/xml",
        )

    monkeypatch.setattr("apps.ingestion.adapters.urllib.request.urlopen", download)
    kwargs = dict(url="https://example.org/oai?verb=ListRecords&metadataPrefix=oai_dc",
                  method="OAI-PMH", registry="Repo", label="Repo", max_records=10)
    first = fetch_feed_batch(**kwargs)
    second = fetch_feed_batch(**kwargs, state=first.next_state)
    third = fetch_feed_batch(**kwargs, state=second.next_state)
    assert [r.title for r in first.records] == [f"Innovation {n}" for n in range(10)]
    assert [r.title for r in second.records] == [f"Innovation {n}" for n in range(10, 20)]
    assert [r.title for r in third.records] == ["Innovation 20", "Innovation 21"]
    assert urls[0] == urls[1]
    assert parse_qs(urlparse(urls[2]).query) == {
        "verb": ["ListRecords"], "resumptionToken": ["next token+value"],
    }
    assert third.next_state == {}


def test_protocol_errors_cannot_be_imported(monkeypatch):
    with pytest.raises(ValueError, match="API"):
        parse_api_payload(b'{"error":"Rate limit"}', content_type="application/json",
                          base_url="https://example.org", registry="Test", label="Test")
    monkeypatch.setattr(
        "apps.ingestion.adapters.urllib.request.urlopen",
        lambda req, timeout=15: _response(
            '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">'
            '<error code="badArgument">Invalid request</error></OAI-PMH>', "text/xml",
        ),
    )
    with pytest.raises(ValueError, match="badArgument"):
        fetch_feed_batch(url="https://example.org/oai", method="OAI-PMH", registry="R", label="R")


@pytest.mark.django_db
def test_live_state_persists_and_network_error_preserves_position(settings, monkeypatch):
    settings.GEMINI_API_KEY = ""
    feed = SourceFeed.objects.create(
        name="Live feed", url="https://example.org/feed", method="API",
        category="Nauka", last_synced_at=timezone.now(), config={"max_records": 10},
    )
    states = []

    def fetch(**kwargs):
        states.append(kwargs["state"])
        return FeedBatch([], {"url": "https://example.org/feed?page=2", "offset": 0})

    monkeypatch.setattr("apps.ingestion.pipeline.fetch_feed_batch", fetch)
    run_ingestion_pipeline(feed_ids=[feed.id])
    run_ingestion_pipeline(feed_ids=[feed.id])
    assert states == [{}, {"url": "https://example.org/feed?page=2", "offset": 0}]

    def failure(**kwargs):
        raise TimeoutError("Remote timed out")

    monkeypatch.setattr("apps.ingestion.pipeline.fetch_feed_batch", failure)
    run = run_ingestion_pipeline(feed_ids=[feed.id])
    feed.refresh_from_db()
    assert run.errors_count == 1
    assert feed.status == "error"
    assert feed.harvest_state == states[-1]


@pytest.mark.django_db
def test_operator_permission_offline_rejection_and_busy_response(monkeypatch):
    client = APIClient()
    for path in ("/api/admin/source-feeds/", "/api/admin/innovations/",
                 "/api/admin/implementations/"):
        assert client.get(path).status_code == 403
    user = get_user_model().objects.create_user(username="normal")
    client.force_authenticate(user)
    assert client.post("/api/admin/ingestion/run/", {}).status_code == 403
    AdopterProfile.objects.create(user=user, is_pci_admin=True)
    assert client.get("/api/admin/source-feeds/").status_code == 200
    assert client.post("/api/admin/ingestion/run/", {"live_fetch": False}).status_code == 400
    assert client.post("/api/admin/source-feeds/", {
        "name": "Fake", "category": "Nauka", "url": "https://example.org", "method": "API",
        "config": {"sample_items": []},
    }, format="json").status_code == 400

    def busy(**kwargs):
        raise IngestionBusyError("Pobieranie już trwa")

    monkeypatch.setattr("apps.ingestion.views.run_ingestion_pipeline", busy)
    assert client.post("/api/admin/ingestion/run/", {}).status_code == 409


@pytest.mark.django_db(transaction=True)
def test_database_lock_excludes_other_connections_and_releases():
    def another_connection():
        try:
            with ingestion_lock():
                return True
        except IngestionBusyError:
            return False
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=1) as pool:
        with ingestion_lock():
            assert pool.submit(another_connection).result(timeout=10) is False
        assert pool.submit(another_connection).result(timeout=10) is True
    assert connection.vendor in {"postgresql", "sqlite"}


def test_worker_once_is_real_and_rejects_invalid_intervals(monkeypatch):
    calls = []

    def run(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(id=3, status="completed", summary="Real refresh")

    module = "apps.ingestion.management.commands.run_ingestion_worker"
    monkeypatch.setattr(f"{module}.run_ingestion_pipeline", run)
    out = io.StringIO()
    call_command("run_ingestion_worker", "--once", stdout=out)
    assert calls == [{"actor": "scheduled_harvester"}]
    assert "Real refresh" in out.getvalue()
    with pytest.raises(CommandError, match="60"):
        call_command("run_ingestion_worker", "--once", "--interval=0")
