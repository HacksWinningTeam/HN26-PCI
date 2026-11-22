from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

from apps.accounts.models import AdopterProfile
from apps.core.gemini import call_gemini_json
from apps.innovations.models import Innovation

logger = logging.getLogger(__name__)


def select_plan_variant(innovation: Innovation) -> tuple[str, str]:
    """Deterministic rule selecting validation, pilot, or transfer_deployment."""
    level = innovation.deployment_level
    if level == "concept" or (level == "prototype" and (innovation.trl or 0) <= 3):
        return (
            "validation",
            "Innowacja jest na etapie koncepcji lub wczesnego prototypu — "
            "system generuje plan walidacji przed podjęciem decyzji o pilotażu.",
        )
    if level in {"prototype", "tests"}:
        return (
            "pilot",
            "Innowacja jest przetestowanym prototypem lub w fazie testów — "
            "system generuje plan ograniczonego pilotażu w organizacji.",
        )
    return (
        "transfer_deployment",
        "Innowacja jest wdrożona lub sprawdzona w praktyce — "
        "system generuje plan transferu i wdrożenia w nowej jednostce.",
    )


def select_recommendation_path(
    innovation: Innovation,
    profile: AdopterProfile,
    variant: str,
) -> tuple[str, str]:
    """Select an actionable recommendation path respecting maturity, evidence, and patent status."""
    if innovation.patent_status in {"application_filed", "patent_granted"} and (
        innovation.deployment_level != "deployed"
    ):
        return (
            "contact_creator",
            "Innowacja ma status zgłoszenia lub ochrony patentowej (UPRP/EPO) i nie jest "
            "jeszcze masowo wdrożona — pierwszym krokiem powinien być bezpośredni kontakt "
            "z właścicielem IP lub Centrum Transferu Technologii.",
        )
    if variant == "validation":
        return (
            "partnership",
            "Ze względu na wczesny etap rozwoju zalecane jest partnerstwo badawczo-"
            "walidacyjne z twórcą zamiast bezpośredniego wdrożenia czy komercjalizacji.",
        )
    if variant == "pilot":
        return (
            "pilot",
            f"Rozwiązanie posiada wstępne testy — optymalną ścieżką dla "
            f"{profile.organization_name or 'organizacji'} jest kontrolowany pilotaż.",
        )
    return (
        "transfer",
        "Rozwiązanie jest sprawdzone w praktyce i gotowe do transferu oraz adaptacji "
        "w procedurach jednostki.",
    )


def find_similar_innovations(innovation: Innovation, limit: int = 3) -> list[dict[str, Any]]:
    """Return top similar public innovations based on area, sectors, beneficiaries, and tags."""
    candidates = Innovation.objects.filter(is_merged=False, is_public=True).exclude(
        pk=innovation.pk
    )
    inv_sectors = set(innovation.sectors or [])
    inv_bens = set(innovation.beneficiary_groups or [])
    inv_tags = set(innovation.tags or [])

    scored: list[tuple[int, Innovation]] = []
    for cand in candidates:
        overlap = (
            (3 if cand.primary_area == innovation.primary_area else 0)
            + 2 * len(inv_sectors & set(cand.sectors or []))
            + len(inv_bens & set(cand.beneficiary_groups or []))
            + len(inv_tags & set(cand.tags or []))
        )
        if overlap > 0:
            scored.append((overlap, cand))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [
        {
            "slug": cand.slug,
            "title_pl": cand.title_pl,
            "primary_area": cand.primary_area,
            "deployment_level": cand.deployment_level,
            "origin_location": cand.origin_location,
        }
        for _, cand in scored[:limit]
    ]


def build_missing_blockers(innovation: Innovation, profile: AdopterProfile) -> list[str]:
    """Identify gaps that must be resolved before moving to execution."""
    blockers = list(innovation.missing_info or [])
    if innovation.conflicting_info:
        blockers.append(
            "Wyjaśnić sprzeczne dane źródłowe przed rozpoczęciem etapu wykonawczego."
        )
    if not profile.is_complete():
        blockers.append(
            "Uzupełnić pełny kontekst organizacji w ankiecie (nazwa, rola, lokalizacja)."
        )
    return list(dict.fromkeys(blockers))


def build_personalized_metrics(
    innovation: Innovation,
    profile: AdopterProfile,
    variant: str,
) -> list[str]:
    """Return 1–3 concrete success metrics adapted to organization scale and plan variant."""
    metrics = list(innovation.metrics or [])[:2]
    users_count = profile.potential_users_count or 100
    if len(metrics) < 3:
        if variant == "validation":
            metrics.append(
                f"Zebranie ustrukturyzowanej oceny od >= {min(users_count, 25)} "
                "docelowych użytkowników"
            )
        elif variant == "pilot":
            metrics.append(
                f"Przeprowadzenie pilotażu na próbie {min(users_count, 100)} odbiorców "
                "bez krytycznych incydentów"
            )
        else:
            metrics.append(
                f"Objęcie rozwiązaniem min. 70% z {users_count} planowanych odbiorców w jednostce"
            )
    return metrics[:3]


def build_five_phases(
    innovation: Innovation,
    profile: AdopterProfile,
    variant: str,
    recommendation_path: str | None = None,
) -> list[dict]:
    org_name = profile.organization_name or "Twoja organizacja"
    location = profile.deployment_location or "lokalizacja docelowa"
    users_count = profile.potential_users_count or 100
    contact = innovation.contact_info or {}
    contact_label = contact.get("unit_name") or innovation.organization_name

    phase_4_title = {
        "validation": "Walidacja potrzeb i założeń",
        "pilot": "Pilotaż w warunkach organizacji",
        "transfer_deployment": "Wdrożenie i uruchomienie operacyjne",
    }[variant]

    phase_4_actions = {
        "validation": [
            (
                f"Przeprowadzić krótką walidację problemu na próbie "
                f"{min(users_count, 30)} użytkowników w {org_name}."
            ),
            "Zweryfikować braki dowodowe wskazane w karcie innowacji z twórcą.",
            "Warunek przejścia: potwierdzenie przydatności do budowy/testu prototypu.",
        ],
        "pilot": [
            (
                f"Uruchomić ograniczony pilotaż dla ok. "
                f"{min(users_count, 100)} odbiorców w {location}."
            ),
            "Monitorować błędy operacyjne i czas obsługi według protokołu.",
            "Warunek przejścia: osiągnięcie kryteriów akceptacji pilotażu.",
        ],
        "transfer_deployment": [
            f"Skonfigurować rozwiązanie dla {users_count} odbiorców w {org_name} ({location}).",
            "Przeszkolić zespół odpowiedzialny za bieżące utrzymanie.",
            "Warunek przejścia: pełne przejęcie operacyjne i zgodność z procedurami.",
        ],
    }[variant]

    current_proc = profile.current_approach or "obecny proces w jednostce"
    constraints = profile.key_constraints or "brak zadeklarowanych ograniczeń"
    resources = profile.available_resources or "budżet i zaplecze jednostki"
    role = profile.role_title or "koordynator"
    competencies = profile.team_competencies or "do ustalenia z twórcą"
    timeline = profile.target_timeline or "termin do ustalenia"
    email = contact.get("email", "kontakt ze źródła")
    missing_items = "; ".join(innovation.missing_info or []) or "brak zidentyfikowanych braków"
    req_items = "; ".join(innovation.required_resources or []) or "zgodnie z dokumentacją źródłową"
    risk_items = "; ".join(innovation.risks or []) or "brak ryzyk krytycznych"
    metric_items = (
        "; ".join(build_personalized_metrics(innovation, profile, variant))
        or "zdefiniowane mierniki rezultatu"
    )

    phase_2_actions = [
        f"Skontaktować się z {contact_label} ({email}).",
        f"Pozyskać dokumentację oraz wyjaśnić braki informacyjne: {missing_items}.",
        (
            f"Pierwszy kontakt oprzeć o kontekst: {users_count} potencjalnych "
            f"użytkowników, zakładany termin ({timeline}) i cel wdrożenia."
        ),
    ]
    if recommendation_path == "contact_creator":
        phase_2_actions.insert(
            1,
            "Ustalić z właścicielem IP / CTT zakres ochrony patentowej (UPRP/EPO) "
            "oraz warunki licencji lub wspólnych prób.",
        )

    return [
        {
            "phase_number": 1,
            "phase_key": "fit_confirmation",
            "title": "Potwierdzenie dopasowania",
            "actions": [
                f"Sprawdzić zgodność z obecnym sposobem działania ({current_proc}).",
                f"Zweryfikować warunki lokalne w {location} i ograniczenia: {constraints}.",
                "Potwierdzić główne założenia rozwiązania na podstawie faktów z karty.",
            ],
            "deliverable": "Notatka potwierdzająca dopasowanie potrzeb i założeń",
        },
        {
            "phase_number": 2,
            "phase_key": "contact_materials",
            "title": "Kontakt i materiały",
            "actions": phase_2_actions,
            "deliverable": "Zebrane materiały źródłowe i potwierdzony kanał współpracy",
        },
        {
            "phase_number": 3,
            "phase_key": "org_readiness",
            "title": "Przygotowanie organizacji",
            "actions": [
                (
                    f"Zabezpieczyć zasoby jednostki ({resources}) względem wymagań "
                    f"({req_items}) i wyznaczyć rolę wiodącą ({role})."
                ),
                f"Uzupełnić kompetencje zespołu: {competencies}.",
                (
                    f"Przygotować wymagania techniczne/formalne i plan ograniczenia ryzyk: "
                    f"{risk_items}."
                ),
            ],
            "deliverable": "Gotowość organizacyjna, zespół i harmonogram prac",
        },
        {
            "phase_number": 4,
            "phase_key": "execution",
            "title": phase_4_title,
            "actions": phase_4_actions,
            "deliverable": f"Raport z etapu: {phase_4_title}",
        },
        {
            "phase_number": 5,
            "phase_key": "evaluation_scaling",
            "title": "Ocena i skalowanie",
            "actions": [
                f"Zmierzyć mierniki sukcesu ({metric_items}) względem stanu sprzed wdrożenia.",
                "Ocenić rezultaty z użytkownikami końcowymi i zespołem.",
                "Podjąć decyzję o kontynuacji, korekcie lub rozszerzeniu rozwiązania.",
            ],
            "deliverable": "Podsumowanie efektów i decyzja o skalowaniu",
        },
    ]


def personalize_phases_with_gemini(
    phases: list[dict],
    innovation: Innovation,
    profile: AdopterProfile,
    variant: str,
    recommendation_path: str,
) -> tuple[list[dict], bool]:
    """Optionally tailor step wording via Gemini without changing rules, contacts, or facts."""
    if not getattr(settings, "GEMINI_API_KEY", "").strip():
        return phases, False

    prompt = (
        "Dopasuj język listy działań w 5 fazach planu do kontekstu organizacji, "
        "zachowując dokładnie wszystkie fakty, kontakty, wariant planu i liczby. "
        "Nie wymyślaj nowych danych kontaktowych ani nie zmieniaj kolejności faz. "
        'Zwróć JSON: {"phases": [{"phase_number": 1, "actions": ["..."]}]}.\n\n'
        f"Innowacja: {innovation.title_pl} | Wariant: {variant} | Ścieżka: {recommendation_path}\n"
        f"Organizacja: {profile.organization_name} ({profile.organization_type}), "
        f"rola: {profile.role_title}, lokalizacja: {profile.deployment_location}, "
        f"użytkownicy: {profile.potential_users_count}, ograniczenia: {profile.key_constraints}\n"
        f"Fazy bazowe: {json.dumps(phases, ensure_ascii=False)}"
    )
    parsed = call_gemini_json(prompt, temperature=0.2)
    if parsed is None:
        return phases, False

    try:
        ai_phases = parsed.get("phases") if isinstance(parsed, dict) else parsed
        if not isinstance(ai_phases, list) or len(ai_phases) != 5:
            return phases, False
        actions_by_num = {
            int(p["phase_number"]): [str(a).strip() for a in p["actions"] if str(a).strip()]
            for p in ai_phases
            if isinstance(p, dict) and isinstance(p.get("actions"), list)
        }
        updated: list[dict] = []
        for base in phases:
            num = base["phase_number"]
            custom_actions = actions_by_num.get(num)
            if not custom_actions:
                return phases, False
            updated.append({**base, "actions": custom_actions[:5]})
        return updated, True
    except (KeyError, IndexError, ValueError, TypeError) as exc:
        logger.warning("Gemini plan personalization parse failed, using rules: %s", exc)
        return phases, False
