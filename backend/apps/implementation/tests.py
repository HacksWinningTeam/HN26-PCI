import json
import urllib.error

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient


class _FakeGeminiHTTPResponse:
    def __init__(self, payload: dict) -> None:
        self._body = json.dumps(payload).encode("utf-8")

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@pytest.mark.django_db
def test_recommendation_paths_patent_similar_blockers_and_export(settings):
    settings.GEMINI_API_KEY = ""
    call_command("seed_demo")
    client = APIClient()

    reg = client.post(
        "/api/auth/register/",
        {
            "email": "wdrozenia@firma.pl",
            "password": "password123",
            "full_name": "Jan Inżynier",
            "organization_type": "company",
            "organization_name": "AeroTech Mielec",
            "role_title": "Kierownik jakości",
            "deployment_location": "Mielec, Podkarpackie",
        },
        format="json",
    )
    assert reg.status_code == 201

    # Patent-filed early-stage innovation selects contact_creator path
    patent_plan = client.post(
        "/api/implementation-plans/",
        {"innovation_slug": "aerosense-ndt"},
        format="json",
    )
    assert patent_plan.status_code == 201
    assert patent_plan.data["variant"] == "transfer_deployment"
    assert patent_plan.data["recommendation_path"] == "contact_creator"
    assert "UPRP/EPO" in patent_plan.data["recommendation_rationale"]
    assert any("UPRP/EPO" in act for act in patent_plan.data["steps"][1]["actions"])
    assert len(patent_plan.data["similar_innovations"]) >= 1
    assert len(patent_plan.data["missing_info_blockers"]) >= 1
    assert 1 <= len(patent_plan.data["success_metrics"]) <= 3
    assert patent_plan.data["ai_personalized"] is False

    # Concept-level innovation selects validation + partnership (no forced commercialization)
    val_plan = client.post(
        "/api/implementation-plans/",
        {"innovation_slug": "labmicrobe-ai"},
        format="json",
    )
    assert val_plan.status_code == 201
    assert val_plan.data["variant"] == "validation"
    assert val_plan.data["recommendation_path"] == "partnership"

    # Export endpoints (md, csv, json)
    plan_id = patent_plan.data["id"]
    md_res = client.get(f"/api/implementation-plans/{plan_id}/export/?export_format=md")
    assert md_res.status_code == 200
    assert b"AeroSense Composite NDT" in md_res.content

    csv_res = client.get(f"/api/implementation-plans/{plan_id}/export/?export_format=csv")
    assert csv_res.status_code == 200
    assert b"fit_confirmation" in csv_res.content

    json_res = client.get(f"/api/implementation-plans/{plan_id}/export/?export_format=json")
    assert json_res.status_code == 200
    assert json_res.data["recommendation_path"] == "contact_creator"

    # Unauthenticated export blocked
    anon = APIClient()
    assert anon.get(f"/api/implementation-plans/{plan_id}/export/").status_code in {401, 403}


@pytest.mark.django_db
def test_gemini_plan_personalization_and_fallback(settings, monkeypatch):
    call_command("seed_demo")
    client = APIClient()
    client.post(
        "/api/auth/register/",
        {
            "email": "gmina@test.pl",
            "password": "password123",
            "organization_type": "public_institution",
            "organization_name": "Gmina Boguchwała",
            "role_title": "Sekretarz",
            "deployment_location": "Boguchwała",
        },
        format="json",
    )

    settings.GEMINI_API_KEY = "test-gemini-key"
    fake_gemini = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "phases": [
                                        {
                                            "phase_number": 1,
                                            "actions": ["Sprawdzić potrzeby w Gminie Boguchwała."],
                                        },
                                        {
                                            "phase_number": 2,
                                            "actions": ["Wysłać zapytanie do Biura Cyfryzacji."],
                                        },
                                        {
                                            "phase_number": 3,
                                            "actions": ["Wyznaczyć koordynatora EZD w gminie."],
                                        },
                                        {
                                            "phase_number": 4,
                                            "actions": ["Uruchomić usługę dla seniorów gminy."],
                                        },
                                        {
                                            "phase_number": 5,
                                            "actions": ["Ocenić spadek wizyt w urzędzie."],
                                        },
                                    ]
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
        lambda req, timeout=15: _FakeGeminiHTTPResponse(fake_gemini),
    )

    ai_plan = client.post(
        "/api/implementation-plans/",
        {"innovation_slug": "e-urzad-senior"},
        format="json",
    )
    assert ai_plan.status_code == 201
    assert ai_plan.data["ai_personalized"] is True
    assert ai_plan.data["steps"][0]["actions"] == ["Sprawdzić potrzeby w Gminie Boguchwała."]

    # Fallback when Gemini raises URLError
    def _fail_urlopen(req, timeout=15):
        raise urllib.error.URLError("offline")

    monkeypatch.setattr("apps.core.gemini.urllib.request.urlopen", _fail_urlopen)
    fallback_plan = client.post(
        "/api/implementation-plans/",
        {"innovation_slug": "e-urzad-senior"},
        format="json",
    )
    assert fallback_plan.status_code == 201
    assert fallback_plan.data["ai_personalized"] is False
    assert len(fallback_plan.data["steps"]) == 5
