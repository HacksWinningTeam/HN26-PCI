import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.innovations.models import Innovation


@pytest.mark.django_db
def test_seed_demo_is_idempotent_and_populates_all_domains():
    call_command("seed_demo")
    first_count = Innovation.objects.count()
    call_command("seed_demo")
    assert Innovation.objects.count() == first_count
    assert first_count >= 7


@pytest.mark.django_db
def test_public_catalog_filters_and_hides_contact_info():
    call_command("seed_demo")
    client = APIClient()

    res = client.get("/api/innovations/", {"primary_area": "administrative"})
    assert res.status_code == 200
    assert any(item["slug"] == "e-urzad-senior" for item in res.data)

    detail = client.get("/api/innovations/e-urzad-senior/")
    assert detail.status_code == 200
    assert "contact_info" not in detail.data
    assert len(detail.data["sources"]) >= 1
    assert len(detail.data["evidences"]) >= 1


@pytest.mark.django_db
def test_discovery_match_40_20_20_20_and_notification():
    call_command("seed_demo")
    client = APIClient()

    res = client.post(
        "/api/discovery/match/",
        {
            "problem_text": (
                "Nasza gmina potrzebuje rozwiązania, które pomoże seniorom "
                "korzystać z usług cyfrowych i ograniczy wizyty w urzędzie"
            ),
            "sector": "administracja",
            "beneficiary_groups": ["seniors_60_plus"],
            "organization_type": "public_institution",
        },
        format="json",
    )
    assert res.status_code == 200
    assert res.data["sufficient"] is True
    assert len(res.data["results"]) >= 1
    top = res.data["results"][0]
    assert top["innovation"]["slug"] == "e-urzad-senior"
    expected_score = round(
        0.40 * top["problem_score"]
        + 0.20 * top["sector_score"]
        + 0.20 * top["beneficiary_score"]
        + 0.20 * top["organization_fit_score"]
    )
    assert top["overall_score"] == expected_score

    # Preferred maturity filters out less mature matches without altering org_fit_score
    strict_res = client.post(
        "/api/discovery/match/",
        {
            "problem_text": "Szybka detekcja biofilmów bakterii w laboratorium",
            "preferred_maturity": "deployed",
        },
        format="json",
    )
    assert strict_res.status_code == 200
    assert all(
        item["innovation"]["slug"] != "labmicrobe-ai"
        for item in strict_res.data["results"]
    )

    # Guest email notification requires email
    bad_notif = client.post("/api/notifications/matches/", {"problem_text": "x"}, format="json")
    assert bad_notif.status_code == 400

    good_notif = client.post(
        "/api/notifications/matches/",
        {"email": "wojtek@gmina.pl", "problem_text": "nowe rozwiązanie"},
        format="json",
    )
    assert good_notif.status_code == 201


@pytest.mark.django_db
def test_auth_boundary_profile_plan_variants_and_pci_admin():
    call_command("seed_demo")
    client = APIClient()

    # Unauthenticated access to protected endpoints is denied
    assert client.get("/api/profile/").status_code in {401, 403}
    assert client.get("/api/innovations/e-urzad-senior/full/").status_code in {401, 403}

    # Register new user
    reg = client.post(
        "/api/auth/register/",
        {
            "email": "dyrektor@szkola.pl",
            "password": "password123",
            "full_name": "Anna Dyrektor",
            "organization_type": "school",
            "organization_name": "SP nr 1 w Krośnie",
            "role_title": "Dyrektor szkoły",
            "deployment_location": "Krosno, Podkarpackie",
        },
        format="json",
    )
    assert reg.status_code == 201
    assert reg.data["authenticated"] is True

    # Level-3 detail reveals contact_info
    full = client.get("/api/innovations/e-urzad-senior/full/")
    assert full.status_code == 200
    assert "email" in full.data["contact_info"]

    # Maturity-aware plan variants
    plan_transfer = client.post(
        "/api/implementation-plans/",
        {
            "innovation_slug": "e-urzad-senior",
            "comparison_slugs": ["e-urzad-senior", "aqua-guard-gdynia"],
        },
        format="json",
    )
    assert plan_transfer.status_code == 201
    assert plan_transfer.data["variant"] == "transfer_deployment"
    assert len(plan_transfer.data["steps"]) == 5

    plan_validation = client.post(
        "/api/implementation-plans/",
        {"innovation_slug": "labmicrobe-ai"},
        format="json",
    )
    assert plan_validation.status_code == 201
    assert plan_validation.data["variant"] == "validation"

    plan_pilot = client.post(
        "/api/implementation-plans/",
        {"innovation_slug": "matematyka-ar-krosno"},
        format="json",
    )
    assert plan_pilot.status_code == 201
    assert plan_pilot.data["variant"] == "pilot"

    # Update step progress
    step_id = plan_transfer.data["steps"][0]["id"]
    step_patch = client.patch(
        f"/api/implementation-steps/{step_id}/",
        {"status": "completed", "notes": "Kontakt nawiązany"},
        format="json",
    )
    assert step_patch.status_code == 200
    assert step_patch.data["status"] == "completed"

    # PCI admin console endpoints are directly accessible on /admin without admin login
    dq = client.get("/api/admin/innovations/")
    assert dq.status_code == 200
    assert len(dq.data["potential_duplicates"]) >= 1
    assert len(dq.data["stale_records"]) >= 1

    merge = client.post("/api/admin/innovations/aqua-guard-gdynia-dup/merge-duplicate/")
    assert merge.status_code == 200
    assert merge.data["target_slug"] == "aqua-guard-gdynia"

    impls = client.get("/api/admin/implementations/")
    assert impls.status_code == 200
    assert len(impls.data) >= 2
