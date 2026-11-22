import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.discovery.models import ScoringConfig
from apps.ingestion.models import InnovationAuditLog
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

    # Saved innovations: add and remove favorites
    fav_add = client.post(
        "/api/saved-innovations/",
        {"innovation_slug": "aqua-guard-gdynia"},
        format="json",
    )
    assert fav_add.status_code == 201
    fav_list = client.get("/api/saved-innovations/")
    assert any(item["innovation"]["slug"] == "aqua-guard-gdynia" for item in fav_list.data)

    fav_del = client.delete("/api/saved-innovations/aqua-guard-gdynia/")
    assert fav_del.status_code == 204
    fav_del_missing = client.delete("/api/saved-innovations/aqua-guard-gdynia/")
    assert fav_del_missing.status_code == 404

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

    # Ordinary adopters are denied; the existing PCI role is required.
    assert client.get("/api/admin/innovations/").status_code == 403
    operator = get_user_model().objects.create_user(username="pci-operator", is_staff=True)
    client.force_authenticate(operator)
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


@pytest.mark.django_db
def test_phase_a_provenance_oslo_public_flag_scoring_config_and_audit_log():
    call_command("seed_demo")
    client = APIClient()

    # 1. Seeded record exposes provenance, oslo_assessment, radar_user_types, source snapshot & hash
    detail = client.get("/api/innovations/aerosense-ndt/")
    assert detail.status_code == 200
    assert detail.data["patent_status"] == "application_filed"
    assert detail.data["is_synthetic_demo"] is True
    assert detail.data["classification_provenance"]["primary_area"] == "rule_based"
    assert detail.data["oslo_assessment"]["compliant"] is True
    assert "investors_commercial" in detail.data["radar_user_types"]
    assert detail.data["sources"][0]["raw_snapshot"]
    assert len(detail.data["sources"][0]["content_hash"]) == 64

    # 2. ScoringConfig validates weight sum == 100 and affects matching
    bad_cfg = ScoringConfig(
        version="v-bad",
        problem_weight=50,
        sector_weight=20,
        beneficiary_weight=20,
        organization_fit_weight=20,
    )
    with pytest.raises(ValidationError):
        bad_cfg.full_clean()

    custom_cfg = ScoringConfig.objects.create(
        version="v1.1-test",
        is_active=True,
        problem_weight=70,
        sector_weight=10,
        beneficiary_weight=10,
        organization_fit_weight=10,
        min_score_threshold=20,
        low_confidence_threshold=40,
    )
    match_res = client.post(
        "/api/discovery/match/",
        {
            "problem_text": "Seniorzy mają trudność z e-usługami i wizytami w urzędzie",
            "sector": "administracja",
            "beneficiary_groups": ["seniors_60_plus"],
            "organization_type": "public_institution",
        },
        format="json",
    )
    assert match_res.status_code == 200
    assert match_res.data["scoring_version"] == custom_cfg.version
    top = match_res.data["results"][0]
    expected = round(
        (
            70 * top["problem_score"]
            + 10 * top["sector_score"]
            + 10 * top["beneficiary_score"]
            + 10 * top["organization_fit_score"]
        )
        / 100
    )
    assert top["overall_score"] == expected

    # 3. Admin PATCH writes InnovationAuditLog and can hide record from public catalog
    operator = get_user_model().objects.create_user(username="pci-operator", is_staff=True)
    client.force_authenticate(operator)
    patch_res = client.patch(
        "/api/admin/innovations/labmicrobe-ai/",
        {
            "is_public": False,
            "verification_status": "verified",
            "verification_method": "Zweryfikowano testem",
        },
        format="json",
    )
    assert patch_res.status_code == 200
    assert patch_res.data["is_public"] is False

    # Hidden from public list, detail, and discovery match
    pub_list = client.get("/api/innovations/")
    assert all(item["slug"] != "labmicrobe-ai" for item in pub_list.data)
    assert client.get("/api/innovations/labmicrobe-ai/").status_code == 404

    logs = InnovationAuditLog.objects.filter(innovation__slug="labmicrobe-ai")
    assert logs.exists()
    latest = logs.first()
    assert latest is not None
    assert latest.action == "verify"
    assert "is_public" in latest.changes
    assert latest.changes["is_public"] == {"old": True, "new": False}

    # Merge also creates audit logs on target and duplicate
    merge_res = client.post("/api/admin/innovations/aqua-guard-gdynia-dup/merge-duplicate/")
    assert merge_res.status_code == 200
    assert InnovationAuditLog.objects.filter(
        innovation__slug="aqua-guard-gdynia", action="merge"
    ).exists()
