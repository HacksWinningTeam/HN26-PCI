from apps.accounts.models import AdopterProfile
from apps.innovations.models import Innovation


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


def build_five_phases(
    innovation: Innovation,
    profile: AdopterProfile,
    variant: str,
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
    metric_items = "; ".join(innovation.metrics or []) or "zdefiniowane mierniki rezultatu"

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
            "actions": [
                f"Skontaktować się z {contact_label} ({email}).",
                f"Pozyskać dokumentację oraz wyjaśnić braki informacyjne: {missing_items}.",
                (
                    f"Pierwszy kontakt oprzeć o kontekst: {users_count} potencjalnych "
                    f"użytkowników, zakładany termin ({timeline}) i cel wdrożenia."
                ),
            ],
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
