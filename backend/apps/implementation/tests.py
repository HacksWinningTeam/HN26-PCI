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


@pytest.mark.django_db
def test_impact_radar_real_collection_and_pci_verification(settings):
    settings.GEMINI_API_KEY = ""
    call_command("seed_demo")

    from django.contrib.auth import get_user_model

    User = get_user_model()
    pci_admin = User.objects.create_user(
        username="pci-radar-admin",
        email="pci-radar@pcinn.org",
        password="password123",
        is_staff=True,
    )

    adopter = APIClient()
    reg = adopter.post(
        "/api/auth/register/",
        {
            "email": "szkola@rzeszow.pl",
            "password": "password123",
            "full_name": "Anna Dyrektor",
            "organization_type": "school",
            "organization_name": "Szkoła Podstawowa nr 12",
            "role_title": "Dyrektor",
            "deployment_location": "Rzeszów",
        },
        format="json",
    )
    assert reg.status_code == 201

    # Non-admin blocked from Impact Radar endpoints
    assert adopter.get("/api/admin/impact-radar/").status_code == 403

    admin_client = APIClient()
    admin_client.force_authenticate(user=pci_admin)
    baseline = admin_client.get("/api/admin/impact-radar/")
    assert baseline.status_code == 200
    base_funnel = baseline.data["funnel"]

    plan_res = adopter.post(
        "/api/implementation-plans/",
        {"innovation_slug": "e-urzad-senior"},
        format="json",
    )
    assert plan_res.status_code == 201
    plan_id = plan_res.data["id"]
    step_3_id = plan_res.data["steps"][2]["id"]

    # Initially: +1 created plan, +0 started pilots
    radar_initial = admin_client.get("/api/admin/impact-radar/")
    assert radar_initial.status_code == 200
    assert radar_initial.data["funnel"]["created_plans"] == base_funnel["created_plans"] + 1
    assert radar_initial.data["funnel"]["started_pilots"] == base_funnel["started_pilots"]
    assert (
        radar_initial.data["funnel"]["confirmed_deployments"]
        == base_funnel["confirmed_deployments"]
    )
    assert radar_initial.data["funnel"]["verified_effects"] == base_funnel["verified_effects"]

    # Advancing Phase 3 automatically starts pilot tracking
    step_res = adopter.patch(
        f"/api/implementation-steps/{step_3_id}/",
        {"status": "in_progress"},
        format="json",
    )
    assert step_res.status_code == 200
    radar_pilot = admin_client.get("/api/admin/impact-radar/")
    assert radar_pilot.data["funnel"]["started_pilots"] == base_funnel["started_pilots"] + 1
    row_pilot = next(r for r in radar_pilot.data["transfers"] if r["plan_id"] == plan_id)
    assert row_pilot["pilot_started_at"] is not None

    # Adopter submits real deployment & outcome report with before/after metrics + file attachment
    report_res = adopter.patch(
        f"/api/implementation-plans/{plan_id}/",
        {
            "adopter_deployment_status": "deployed",
            "deployment_started_on": "2026-11-20",
            "reached_beneficiaries_count": 145,
            "metric_before": "45 min / wniosek",
            "metric_after": "12 min / wniosek",
            "outcome_summary": "Wdrożono obsługę elektroniczną dla 145 rodziców i seniorów.",
            "outcome_visibility": "public_summary",
            "evidence_url": "https://bip.rzeszow.pl/raport-wdrozenia",
        },
        format="json",
    )
    assert report_res.status_code == 200
    assert report_res.data["adopter_deployment_status"] == "deployed"
    assert report_res.data["reached_beneficiaries_count"] == 145
    assert report_res.data["metric_before"] == "45 min / wniosek"
    assert report_res.data["metric_after"] == "12 min / wniosek"
    assert report_res.data["outcome_visibility"] == "public_summary"
    assert report_res.data["deployment_reported_at"] is not None

    from django.core.files.uploadedfile import SimpleUploadedFile

    bad_file = SimpleUploadedFile("virus.exe", b"MZ", content_type="application/octet-stream")
    bad_upload = adopter.post(
        f"/api/implementation-plans/{plan_id}/attachment/",
        {"file": bad_file},
        format="multipart",
    )
    assert bad_upload.status_code == 400

    pdf_file = SimpleUploadedFile(
        "raport-efektow.pdf",
        b"%PDF-1.4\nReal outcome report\n%%EOF",
        content_type="application/pdf",
    )
    upload_res = adopter.post(
        f"/api/implementation-plans/{plan_id}/attachment/",
        {"file": pdf_file},
        format="multipart",
    )
    assert upload_res.status_code == 200
    assert upload_res.data["outcome_attachment_name"] == "raport-efektow.pdf"
    assert (
        upload_res.data["outcome_attachment_url"]
        == f"/api/implementation-plans/{plan_id}/attachment/"
    )

    # PCI Admin can download the real attachment and sees completed deployment & transfer pair
    dl_res = admin_client.get(f"/api/implementation-plans/{plan_id}/attachment/")
    assert dl_res.status_code == 200
    assert b"Real outcome report" in dl_res.content

    radar_awaiting = admin_client.get("/api/admin/impact-radar/")
    assert (
        radar_awaiting.data["funnel"]["awaiting_pci_review"]
        == base_funnel["awaiting_pci_review"] + 1
    )
    assert (
        radar_awaiting.data["funnel"]["confirmed_deployments"]
        == base_funnel["confirmed_deployments"] + 1
    )
    row_awaiting = next(r for r in radar_awaiting.data["transfers"] if r["plan_id"] == plan_id)
    assert row_awaiting["awaiting_pci_review"] is True
    assert row_awaiting["stage_key"] == "deployed"
    assert "Sukces" in row_awaiting["stage_label"]
    assert row_awaiting["source_organization_name"]
    assert row_awaiting["outcome_attachment_name"] == "raport-efektow.pdf"
    assert row_awaiting["metric_before"] == "45 min / wniosek"
    assert row_awaiting["metric_after"] == "12 min / wniosek"

    # needs_clarification requires a note
    bad_clarify = admin_client.post(
        f"/api/admin/implementations/{plan_id}/verify-transfer/",
        {"pci_transfer_status": "needs_clarification", "pci_transfer_note": ""},
        format="json",
    )
    assert bad_clarify.status_code == 400

    # PCI confirms deployment
    confirm_res = admin_client.post(
        f"/api/admin/implementations/{plan_id}/verify-transfer/",
        {
            "pci_transfer_status": "deployment_confirmed",
            "pci_transfer_note": "Potwierdzono publikację na BIP.",
        },
        format="json",
    )
    assert confirm_res.status_code == 200
    assert confirm_res.data["pci_transfer_status"] == "deployment_confirmed"

    # PCI verifies measured effect
    verify_res = admin_client.post(
        f"/api/admin/implementations/{plan_id}/verify-transfer/",
        {
            "pci_transfer_status": "effect_verified",
            "pci_transfer_note": "Zweryfikowano wskaźnik 145 odbiorców.",
        },
        format="json",
    )
    assert verify_res.status_code == 200
    assert verify_res.data["stage_key"] == "effect_verified"

    radar_final = admin_client.get("/api/admin/impact-radar/")
    assert radar_final.data["funnel"] == {
        "created_plans": base_funnel["created_plans"] + 1,
        "started_pilots": base_funnel["started_pilots"] + 1,
        "confirmed_deployments": base_funnel["confirmed_deployments"] + 1,
        "verified_effects": base_funnel["verified_effects"] + 1,
        "awaiting_pci_review": base_funnel["awaiting_pci_review"],
        "total_reached_beneficiaries": base_funnel["total_reached_beneficiaries"] + 145,
    }
