"""Side-by-side innovation comparison builder and Markdown/CSV exporters."""

from __future__ import annotations

import csv
import io
from typing import Any

from apps.innovations.models import Innovation
from apps.innovations.serializers import InnovationDetailSerializer

from .matching import MATURITY_ORDER, score_innovation_for_query
from .models import ScoringConfig

SCORE_KEYS = (
    "innovativeness",
    "application_potential",
    "transferability",
    "credibility",
)


def _evidence_summary(innovation: Innovation) -> dict[str, int]:
    evidences = list(innovation.evidences.all())
    sources = list(innovation.sources.all())
    return {
        "verified_facts_count": sum(1 for e in evidences if e.kind == "verified_fact"),
        "declarations_count": sum(1 for e in evidences if e.kind == "source_declaration"),
        "system_calculations_count": sum(1 for e in evidences if e.kind == "system_calculation"),
        "ai_estimates_count": sum(1 for e in evidences if e.kind == "ai_estimate"),
        "missing_info_count": len(innovation.missing_info or [])
        + sum(1 for e in evidences if e.kind == "missing_info"),
        "sources_count": len(sources),
        "available_sources_count": sum(1 for s in sources if s.is_available),
    }


def build_comparison_payload(
    innovations: list[Innovation],
    *,
    problem_text: str = "",
    sector: str = "",
    beneficiary_groups: list[str] | None = None,
    organization_type: str = "",
) -> dict[str, Any]:
    """Construct side-by-side comparison matrix, score leaders, and difference callouts."""
    config = ScoringConfig.get_active()
    weights = (
        config.problem_weight,
        config.sector_weight,
        config.beneficiary_weight,
        config.organization_fit_weight,
    )
    has_query_context = bool(
        problem_text.strip() or sector or beneficiary_groups or organization_type
    )

    items: list[dict[str, Any]] = []
    for inv in innovations:
        match_breakdown = None
        if has_query_context:
            match_breakdown = score_innovation_for_query(
                inv,
                problem_text=problem_text,
                sector=sector,
                beneficiary_groups=beneficiary_groups,
                organization_type=organization_type,
                weights=weights,
            )
        items.append(
            {
                "innovation": InnovationDetailSerializer(inv).data,
                "evidence_quality": _evidence_summary(inv),
                "match_breakdown": match_breakdown,
            }
        )

    score_leaders: dict[str, str] = {}
    for key in SCORE_KEYS:
        best = max(innovations, key=lambda x: int((x.scores or {}).get(key, 0)))
        score_leaders[key] = best.slug

    strongest = max(
        innovations,
        key=lambda x: sum(int((x.scores or {}).get(k, 0)) for k in SCORE_KEYS),
    )
    most_mature = max(
        innovations,
        key=lambda x: (MATURITY_ORDER.get(x.deployment_level, 0), x.trl or 0),
    )
    highest_credibility = max(
        innovations,
        key=lambda x: int((x.scores or {}).get("credibility", 0)),
    )

    differences: list[str] = []
    areas = sorted({inv.primary_area for inv in innovations})
    if len(areas) > 1:
        differences.append(f"Różne główne obszary innowacji: {', '.join(areas)}.")
    levels = sorted({inv.deployment_level for inv in innovations})
    if len(levels) > 1:
        differences.append(f"Różne poziomy wdrożenia: {', '.join(levels)}.")
    trls = [inv.trl for inv in innovations if inv.trl is not None]
    if len(set(trls)) > 1:
        differences.append(f"Rozpiętość TRL: od TRL {min(trls)} do TRL {max(trls)}.")
    statuses = sorted({inv.verification_status for inv in innovations})
    if len(statuses) > 1:
        differences.append(f"Różny status weryfikacji rekordów: {', '.join(statuses)}.")
    if not differences:
        differences.append("Porównywane innowacje mają zbliżony obszar i etap dojrzałości.")

    return {
        "scoring_version": config.version,
        "items": items,
        "score_leaders": score_leaders,
        "highlights": {
            "strongest_overall": strongest.slug,
            "most_mature": most_mature.slug,
            "highest_credibility": highest_credibility.slug,
        },
        "differences": differences,
    }


def render_comparison_markdown(comparison: dict[str, Any]) -> str:
    lines = ["# Porównanie innowacji — Radar Innowacji PCI", ""]
    lines.append("## Najważniejsze różnice")
    for diff in comparison.get("differences", []):
        lines.append(f"- {diff}")
    lines.append("")

    for entry in comparison.get("items", []):
        inv = entry["innovation"]
        eq = entry["evidence_quality"]
        scores = inv.get("scores") or {}
        lines.append(f"## {inv['title_pl']} (`{inv['slug']}`)")
        lines.append(f"- **Organizacja:** {inv['organization_name']} ({inv['origin_location']})")
        lines.append(
            f"- **Obszar:** {inv['primary_area']} | "
            f"**Poziom wdrożenia:** {inv['deployment_level']} | "
            f"**TRL:** {inv.get('trl') or 'nd.'}"
        )
        lines.append(f"- **Problem:** {inv['problem_pl']}")
        lines.append(
            f"- **Oceny:** Innowacyjność {scores.get('innovativeness', 0)}%, "
            f"Potencjał {scores.get('application_potential', 0)}%, "
            f"Transfer {scores.get('transferability', 0)}%, "
            f"Wiarygodność {scores.get('credibility', 0)}%"
        )
        lines.append(
            f"- **Dowody i źródła:** fakty={eq['verified_facts_count']}, "
            f"szacunki AI={eq['ai_estimates_count']}, braki={eq['missing_info_count']}, "
            f"źródła={eq['sources_count']}"
        )
        lines.append(f"- **Rekomendowany kolejny krok:** {inv['suggested_next_step']}")
        lines.append("")
    return "\n".join(lines)


def render_comparison_csv(comparison: dict[str, Any]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "slug",
            "title_pl",
            "organization_name",
            "origin_location",
            "primary_area",
            "deployment_level",
            "trl",
            "verification_status",
            "innovativeness",
            "application_potential",
            "transferability",
            "credibility",
            "verified_facts_count",
            "missing_info_count",
            "suggested_next_step",
        ]
    )
    for entry in comparison.get("items", []):
        inv = entry["innovation"]
        eq = entry["evidence_quality"]
        scores = inv.get("scores") or {}
        writer.writerow(
            [
                inv["slug"],
                inv["title_pl"],
                inv["organization_name"],
                inv["origin_location"],
                inv["primary_area"],
                inv["deployment_level"],
                inv.get("trl") or "",
                inv["verification_status"],
                scores.get("innovativeness", ""),
                scores.get("application_potential", ""),
                scores.get("transferability", ""),
                scores.get("credibility", ""),
                eq["verified_facts_count"],
                eq["missing_info_count"],
                inv["suggested_next_step"],
            ]
        )
    return buf.getvalue()
