import csv
import io
import json

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import AdopterProfile
from apps.ingestion.adapters import RawSourceRecord
from apps.ingestion.ai_service import extract_and_classify_innovation
from apps.ingestion.models import InnovationAuditLog
from apps.ingestion.pipeline import ingest_raw_record
from apps.innovations.models import Evidence


def _pci_client():
    user, _ = get_user_model().objects.get_or_create(
        username="t10-pci-operator",
        defaults={"is_staff": True},
    )
    AdopterProfile.objects.get_or_create(user=user, defaults={"is_pci_admin": True})
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_rules_do_not_fabricate_trl_from_deployment_and_guard_planned_mentions(settings):
    settings.GEMINI_API_KEY = ""

    deployed_no_trl = extract_and_classify_innovation(
        "Rozwiązanie zostało wdrożone w praktyce w 5 gminach i działa produkcyjnie.",
        title_hint="System Gminny",
    )
    assert deployed_no_trl["deployment_level"] == "deployed"
    assert deployed_no_trl["trl"] is None
    assert deployed_no_trl["classification_provenance"]["trl"] == "unknown"
    assert deployed_no_trl["classification_provenance"]["deployment_level"] == "rule_based"

    planned = extract_and_classify_innovation(
        "Projekt badawczy mający umożliwić przyszłe wdrożenie w szkołach; obecnie prototyp.",
        title_hint="Narzędzie Szkolne",
    )
    assert planned["deployment_level"] == "prototype"
    assert planned["trl"] is None

    planned_concept = extract_and_classify_innovation(
        "Koncepcja zakłada planowane wdrożenie nowej procedury w urzędach.",
        title_hint="Koncepcja Urzędowa",
    )
    assert planned_concept["deployment_level"] == "concept"

    explicit_trl = extract_and_classify_innovation(
        "Mobilny skaner kompozytów na poziomie TRL 5.",
        title_hint="Skaner NDT",
    )
    assert explicit_trl["trl"] == 5
    assert explicit_trl["classification_provenance"]["trl"] == "rule_based"


def test_oslo_assessment_evaluates_both_criteria_honestly(settings, monkeypatch):
    settings.GEMINI_API_KEY = ""

    # Rule-based never blindly defaults oslo_compliant=True
    proto = extract_and_classify_innovation(
        "Prototyp nowego czujnika jakości powietrza dla szkół.",
        title_hint="Czujnik Szkolny",
    )
    assert proto["oslo_compliant"] is False
    assert proto["oslo_assessment"]["availability_status"] == "not_met"
    assert proto["oslo_assessment"]["status"] in {"partial", "needs_verification"}

    deployed_rules = extract_and_classify_innovation(
        "System wdrożony w praktyce w urzędach; skraca czas obsługi o 40%.",
        title_hint="Asystent Urzędu",
    )
    assert deployed_rules["oslo_assessment"]["availability_status"] == "met"
    assert deployed_rules["oslo_assessment"]["novelty_status"] == "partial"
    assert deployed_rules["oslo_compliant"] is False

    # Gemini with grounded novelty + deployed availability -> compliant AI estimate
    settings.GEMINI_API_KEY = "test-key"
    excerpt = "System automatyzuje obieg pism i skraca czas odpowiedzi o 60%."
    raw = f"{excerpt} Rozwiązanie wdrożono w praktyce w 8 gminach."

    def mock_gemini(prompt, temperature=0.2):
        return {
            "is_relevant_innovation": True,
            "primary_area": "administrative",
            "deployment_level": "deployed",
            "trl": None,
            "oslo_novelty": "Automatyzacja obiegu pism skracająca czas obsługi o 60%.",
            "oslo_novelty_met": True,
            "oslo_availability": "System wdrożono w praktyce w 8 gminach.",
            "oslo_availability_met": True,
            "quality_assessment": {
                "innovativeness": {
                    "difference": {
                        "grade": 3,
                        "reason": "Wyraźne skrócenie czasu obsługi.",
                        "source_url": "https://example.pl/oslo",
                        "excerpt": excerpt,
                    }
                }
            },
        }

    monkeypatch.setattr("apps.ingestion.ai_service.call_gemini_json", mock_gemini)
    ai_deployed = extract_and_classify_innovation(
        raw, title_hint="Obieg Pism", url="https://example.pl/oslo"
    )
    assert ai_deployed["oslo_compliant"] is True
    assert ai_deployed["oslo_assessment"]["status"] == "compliant"
    assert ai_deployed["oslo_assessment"]["method"] == "ai_estimate"
    assert ai_deployed["classification_provenance"]["oslo_compliant"] == "ai_suggested"

    # Prototype cannot be marked Oslo implementation-compliant even if AI claims availability
    def mock_proto_gemini(prompt, temperature=0.2):
        data = mock_gemini(prompt, temperature=temperature)
        data["deployment_level"] = "prototype"
        return data

    monkeypatch.setattr("apps.ingestion.ai_service.call_gemini_json", mock_proto_gemini)
    ai_proto = extract_and_classify_innovation(
        raw, title_hint="Prototyp Pism", url="https://example.pl/oslo"
    )
    assert ai_proto["oslo_assessment"]["availability_status"] == "not_met"
    assert ai_proto["oslo_compliant"] is False


@pytest.mark.django_db
def test_source_change_refreshes_full_classification_maturity_and_evidence(settings):
    settings.GEMINI_API_KEY = ""
    url = "https://example.org/smog-sensor"

    initial = RawSourceRecord(
        title="Czujnik Smogu Szkolny",
        text="Prototyp czujnika smogu dla szkół w Rzeszowie, TRL 4.",
        url=url,
        registry="RUJ UJ",
        label="Czujnik Smogu",
    )
    inv, outcome = ingest_raw_record(initial)
    assert outcome == "created"
    assert inv.deployment_level == "prototype"
    assert inv.trl == 4

    # Operator verifies the prototype and attaches a verified fact
    inv.verification_status = "verified"
    inv.save(update_fields=["verification_status"])
    Evidence.objects.create(
        innovation=inv,
        kind="verified_fact",
        text_pl="Potwierdzono kartę katalogową uczelni.",
        text_en="University fact sheet confirmed.",
    )

    # Later the same source updates to deployed at TRL 8
    progressed = RawSourceRecord(
        title="Czujnik Smogu Szkolny",
        text=(
            "Rozwiązanie wdrożone w praktyce w 12 szkołach na Podkarpaciu, TRL 8. "
            "Zastosowano nowy algorytm kalibracji dla gmin i szkół."
        ),
        url=url,
        registry="RUJ UJ",
        label="Czujnik Smogu",
    )
    updated, outcome = ingest_raw_record(progressed)
    assert outcome == "updated"
    assert updated.pk == inv.pk
    assert updated.deployment_level == "deployed"
    assert updated.trl == 8
    assert updated.verification_status == "pending_review"
    assert "Wykryto wzmiankę o stosowaniu rozwiązania w praktyce." in list(
        updated.evidences.filter(kind="source_declaration").values_list("text_pl", flat=True)
    )
    assert not updated.evidences.filter(text_pl="Wykryto opis prototypu.").exists()
    assert updated.evidences.filter(kind="verified_fact").exists()
    latest_log = InnovationAuditLog.objects.filter(innovation=updated).first()
    assert latest_log is not None
    assert latest_log.action == "classification_update"
    assert latest_log.changes["deployment_level"] == {"old": "prototype", "new": "deployed"}
    assert latest_log.changes["trl"] == {"old": 4, "new": 8}

    # Regression still flags a conflict
    regressed = RawSourceRecord(
        title="Czujnik Smogu Szkolny",
        text="Korekta danych: wczesny prototyp w laboratorium, TRL 3.",
        url=url,
        registry="RUJ UJ",
        label="Czujnik Smogu",
    )
    conflicted, outcome = ingest_raw_record(regressed)
    assert outcome == "conflict"
    assert conflicted.verification_status == "conflict"
    assert len(conflicted.conflicting_info) >= 1


@pytest.mark.django_db
def test_pci_admin_edits_provenance_and_exports_reflect_facts_vs_estimates(settings):
    settings.GEMINI_API_KEY = ""
    rec = RawSourceRecord(
        title="Asystent Dostępności",
        text="Narzędzie wdrożone w praktyce w gminie Krosno.",
        url="https://example.org/asystent-dostepnosci",
        registry="JST",
        label="Asystent",
    )
    inv, _ = ingest_raw_record(rec)
    assert inv.trl is None
    assert inv.classification_provenance["deployment_level"] == "rule_based"
    assert inv.classification_provenance["trl"] == "unknown"

    client = _pci_client()
    patch_res = client.patch(
        f"/api/admin/innovations/{inv.slug}/",
        {
            "deployment_level": "deployed",
            "trl": 8,
            "oslo_compliant": True,
            "verification_status": "verified",
        },
        format="json",
    )
    assert patch_res.status_code == 200
    assert patch_res.data["trl"] == 8
    assert patch_res.data["oslo_compliant"] is True
    assert patch_res.data["classification_provenance"]["deployment_level"] == "pci_verified"
    assert patch_res.data["classification_provenance"]["trl"] == "pci_verified"
    assert patch_res.data["classification_provenance"]["oslo_compliant"] == "pci_verified"
    assert patch_res.data["oslo_assessment"]["method"] == "pci_verified"

    csv_res = client.get(f"/api/innovations/{inv.slug}/export/?export_format=csv")
    assert csv_res.status_code == 200
    rows = list(csv.reader(io.StringIO(csv_res.content.decode("utf-8"))))
    header = rows[0]
    row = rows[1]
    assert row[header.index("deployment_level_provenance")] == "potwierdzone przez PCI"
    assert row[header.index("trl_provenance")] == "potwierdzone przez PCI"
    assert row[header.index("oslo_status")] == "compliant"

    md_res = client.get(f"/api/innovations/{inv.slug}/export/?export_format=md")
    assert md_res.status_code == 200
    md_text = md_res.content.decode("utf-8")
    assert "potwierdzone przez PCI" in md_text
    assert json.loads(json.dumps(patch_res.data["oslo_assessment"]))["status"] == "compliant"
