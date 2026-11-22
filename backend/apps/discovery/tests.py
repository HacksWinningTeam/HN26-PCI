import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.discovery.models import InnovationMatch
from apps.innovations.models import InnovationSource


@pytest.mark.django_db
def test_smart_refinement_completeness_synonyms_and_match_persistence():
    call_command("seed_demo")
    client = APIClient()

    # Partial text without explicit checkboxes returns completeness_percent and suggested_fields
    partial = client.post(
        "/api/discovery/match/",
        {"problem_text": "Nasza gmina szuka pomocy dla emerytów w usługach online"},
        format="json",
    )
    assert partial.status_code == 200
    assert partial.data["sufficient"] is True
    assert 0 < partial.data["completeness_percent"] < 100
    assert "sector" in partial.data["missing_fields"]
    assert "beneficiary_groups" in partial.data["missing_fields"]
    suggested = partial.data["suggested_fields"]
    assert "administracja" in suggested["sectors"]
    assert "seniors_60_plus" in suggested["beneficiary_groups"]
    assert suggested["organization_type"] == "public_institution"
    # Synonym "emerytów" + "online" matches e-urzad-senior ("seniorom", "cyfrowo")
    assert any(r["innovation"]["slug"] == "e-urzad-senior" for r in partial.data["results"])
    assert InnovationMatch.objects.exists()

    # Complete context reports 100% completeness
    full = client.post(
        "/api/discovery/match/",
        {
            "problem_text": "Nasza gmina potrzebuje alertów powodziowych dla sołectw w Gdyni",
            "sector": "administracja",
            "beneficiary_groups": ["public_orgs_communities"],
            "organization_type": "public_institution",
            "deployment_location": "Gdynia",
        },
        format="json",
    )
    assert full.status_code == 200
    assert full.data["completeness_percent"] == 100
    assert full.data["missing_fields"] == []
    assert full.data["results"][0]["innovation"]["slug"] == "aqua-guard-gdynia"


@pytest.mark.django_db
def test_multi_value_catalog_filters_and_verified_sources():
    call_command("seed_demo")
    client = APIClient()

    # OR within primary_area
    multi_area = client.get(
        "/api/innovations/",
        {"primary_area": "administrative,educational"},
    )
    assert multi_area.status_code == 200
    slugs = {item["slug"] for item in multi_area.data}
    assert "e-urzad-senior" in slugs
    assert "matematyka-ar-krosno" in slugs
    assert "aerosense-ndt" not in slugs

    # English search works too
    en_search = client.get("/api/innovations/", {"q": "airframe disassembly"})
    assert en_search.status_code == 200
    assert [item["slug"] for item in en_search.data] == ["aerosense-ndt"]

    # has_verified_sources excludes innovations with only unavailable sources
    InnovationSource.objects.filter(innovation__slug="satguard-agro").update(is_available=False)
    verified_src = client.get(
        "/api/innovations/",
        {"has_verified_sources": "true"},
    )
    assert verified_src.status_code == 200
    assert all(item["slug"] != "satguard-agro" for item in verified_src.data)


@pytest.mark.django_db
def test_compare_endpoint_and_exports():
    call_command("seed_demo")
    client = APIClient()

    cmp_res = client.post(
        "/api/discovery/compare/",
        {
            "innovation_slugs": ["e-urzad-senior", "aqua-guard-gdynia", "labmicrobe-ai"],
            "problem_text": "Gmina potrzebuje cyfrowych usług dla seniorów",
            "sector": "administracja",
        },
        format="json",
    )
    assert cmp_res.status_code == 200
    assert len(cmp_res.data["items"]) == 3
    assert cmp_res.data["items"][0]["match_breakdown"] is not None
    assert cmp_res.data["items"][0]["evidence_quality"]["verified_facts_count"] >= 1
    assert "credibility" in cmp_res.data["score_leaders"]
    assert cmp_res.data["highlights"]["strongest_overall"] in {
        "e-urzad-senior",
        "aqua-guard-gdynia",
    }
    assert len(cmp_res.data["differences"]) >= 1

    # Invalid count returns 400
    bad_cmp = client.post(
        "/api/discovery/compare/",
        {"innovation_slugs": ["e-urzad-senior"]},
        format="json",
    )
    assert bad_cmp.status_code == 400

    # Innovation export: json, md, csv (and never leaks contact_info)
    exp_json = client.get("/api/innovations/e-urzad-senior/export/?export_format=json")
    assert exp_json.status_code == 200
    assert "contact_info" not in exp_json.data

    exp_md = client.get("/api/innovations/e-urzad-senior/export/?export_format=md")
    assert exp_md.status_code == 200
    assert b"# e-Urz" in exp_md.content

    exp_csv = client.get("/api/innovations/e-urzad-senior/export/?export_format=csv")
    assert exp_csv.status_code == 200
    assert b"e-urzad-senior" in exp_csv.content

    # Comparison export: md & csv
    cmp_md = client.post(
        "/api/comparisons/export/",
        {"innovation_slugs": ["e-urzad-senior", "aqua-guard-gdynia"], "export_format": "md"},
        format="json",
    )
    assert cmp_md.status_code == 200
    assert b"Por" in cmp_md.content

    cmp_csv = client.post(
        "/api/comparisons/export/",
        {"innovation_slugs": ["e-urzad-senior", "aqua-guard-gdynia"], "export_format": "csv"},
        format="json",
    )
    assert cmp_csv.status_code == 200
    assert b"aqua-guard-gdynia" in cmp_csv.content
