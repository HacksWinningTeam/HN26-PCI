"""Implementation plan exporters (Markdown & CSV)."""

from __future__ import annotations

import csv
import io

from .models import ImplementationPlan


def render_plan_markdown(plan: ImplementationPlan) -> str:
    inv = plan.innovation
    snap = plan.organization_snapshot or {}
    contact = inv.contact_info or {}
    lines = [
        f"# Plan wdrożeniowy: {inv.title_pl}",
        "",
        f"**Organizacja wdrażająca:** {snap.get('organization_name') or 'Niepodana'}",
        f"**Wariant planu:** {plan.variant} — {plan.variant_rationale}",
        f"**Rekomendowana ścieżka:** {plan.recommendation_path} — {plan.recommendation_rationale}",
        "",
        "## Dane kontaktowe do realizacji planu",
        f"- **Jednostka:** {contact.get('unit_name') or inv.organization_name}",
        f"- **Osoba:** {contact.get('contact_person') or 'Brak danych'}",
        f"- **E-mail:** {contact.get('email') or 'Brak danych'}",
        f"- **Telefon:** {contact.get('phone') or 'Brak danych'}",
        "",
        "## Wymagania i zasoby",
        *[f"- {r}" for r in (plan.requirements or [])],
        "",
        "## Ryzyka i braki do uzupełnienia",
        *[f"- Ryzyko: {r}" for r in (plan.risks or [])],
        *[f"- Brak: {b}" for b in (plan.missing_info_blockers or [])],
        "",
        "## Mierniki sukcesu",
        *[f"- {m}" for m in (plan.success_metrics or [])],
        "",
        "## Plan w 5 fazach",
    ]
    for step in plan.steps.all():
        lines.append(f"### Faza {step.phase_number}: {step.title} [{step.status}]")
        for action in step.actions or []:
            lines.append(f"- {action}")
        lines.append(f"**Rezultat:** {step.deliverable}")
        if step.notes:
            lines.append(f"**Notatki:** {step.notes}")
        lines.append("")
    return "\n".join(lines)


def render_plan_csv(plan: ImplementationPlan) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["phase_number", "phase_key", "title", "status", "deliverable", "actions", "notes"]
    )
    for step in plan.steps.all():
        writer.writerow(
            [
                step.phase_number,
                step.phase_key,
                step.title,
                step.status,
                step.deliverable,
                " | ".join(step.actions or []),
                step.notes,
            ]
        )
    return buf.getvalue()
