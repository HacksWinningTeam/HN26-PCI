"""Public innovation card exporters (JSON, Markdown, CSV)."""

from __future__ import annotations

import csv
import io
import json
from typing import Any

from .models import Innovation
from .serializers import InnovationDetailSerializer

PROVENANCE_EXPORT_LABELS = {
    "source": "ze źródła",
    "pci_verified": "potwierdzone przez PCI",
    "rule_based": "szacunek regułowy",
    "ai_suggested": "szacunek AI",
    "unknown": "brak danych",
}


def _prov_label(provenance: dict[str, Any] | None, field: str) -> str:
    val = (provenance or {}).get(field) or "unknown"
    return PROVENANCE_EXPORT_LABELS.get(str(val), str(val))


def build_innovation_export_dict(innovation: Innovation) -> dict[str, Any]:
    """Return public level-2 card payload safe for external export (no private contacts)."""
    return dict(InnovationDetailSerializer(innovation).data)


def render_innovation_markdown(innovation: Innovation) -> str:
    data = build_innovation_export_dict(innovation)
    prov = data.get("classification_provenance") or {}
    oslo = data.get("oslo_assessment") or {}
    trl_val = f"TRL {data['trl']}/9" if data.get("trl") is not None else "nie określono"
    oslo_status = oslo.get("status") or (
        "compliant" if data.get("oslo_compliant") else "needs_verification"
    )
    lines = [
        f"# {data['title_pl']}",
        "",
        f"**Organizacja:** {data['organization_name']} ({data['origin_location']})",
        (
            f"**Obszar:** {data['primary_area']} | "
            f"**Poziom wdrożenia:** {data['deployment_level']} "
            f"({_prov_label(prov, 'deployment_level')}) | "
            f"**TRL:** {trl_val} ({_prov_label(prov, 'trl')})"
        ),
        (
            f"**Zgodność z Oslo Manual 2018:** {oslo_status} "
            f"({_prov_label(prov, 'oslo_compliant')})"
        ),
        (
            f"**Status weryfikacji:** {data['verification_status']} "
            f"({data.get('verification_method') or 'brak'})"
        ),
        (
            f"**Data pozyskania:** {data['fetched_at']} | "
            f"**Ostatnia weryfikacja:** {data['last_verified_at']}"
        ),
        "",
        "## Streszczenie",
        data["short_summary_pl"],
        "",
        "## Rozwiązywany problem",
        data["problem_pl"],
        "",
        "## Rozwiązanie i sposób działania",
        data["solution_pl"],
        "",
        "## Dowody i klasyfikacja informacji",
    ]
    for ev in data.get("evidences", []):
        lines.append(f"- **[{ev['kind']}]** {ev['text_pl']}")
    if data.get("assessment"):
        lines.extend(["", "## Wstępne oceny (0–100)"])
        for key, dimension in data["assessment"].get("dimensions", {}).items():
            score = dimension["score"]
            lines.append(f"- **{key}:** {score if score is not None else 'brak danych'}; "
                         f"metoda: {dimension['method']}")
    if data.get("missing_info"):
        lines.append("")
        lines.append("## Brakujące informacje")
        for item in data["missing_info"]:
            lines.append(f"- {item}")
    lines.append("")
    lines.append("## Źródła")
    for src in data.get("sources", []):
        lines.append(f"- [{src['registry']}: {src['label']}]({src['url']})")
    return "\n".join(lines)


def render_innovation_csv(innovation: Innovation) -> str:
    data = build_innovation_export_dict(innovation)
    prov = data.get("classification_provenance") or {}
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "slug",
            "title_pl",
            "short_summary_pl",
            "problem_pl",
            "primary_area",
            "innovation_character",
            "sectors",
            "beneficiary_groups",
            "organization_name",
            "origin_location",
            "deployment_level",
            "deployment_level_provenance",
            "trl",
            "trl_provenance",
            "oslo_compliant",
            "oslo_status",
            "verification_status",
            "last_verified_at",
            "sources",
            "innovativeness",
            "application_potential",
            "credibility",
            "assessment",
        ]
    )
    writer.writerow(
        [
            data["slug"],
            data["title_pl"],
            data["short_summary_pl"],
            data["problem_pl"],
            data["primary_area"],
            ", ".join(data.get("innovation_character") or []),
            ", ".join(data.get("sectors") or []),
            ", ".join(data.get("beneficiary_groups") or []),
            data["organization_name"],
            data["origin_location"],
            data["deployment_level"],
            _prov_label(prov, "deployment_level"),
            data.get("trl") if data.get("trl") is not None else "",
            _prov_label(prov, "trl"),
            data.get("oslo_compliant", False),
            (data.get("oslo_assessment") or {}).get("status", ""),
            data["verification_status"],
            data["last_verified_at"],
            "; ".join(src["url"] for src in data.get("sources", [])),
            data["scores"].get("innovativeness", ""),
            data["scores"].get("application_potential", ""),
            data["scores"].get("credibility", ""),
            json.dumps(data["assessment"], ensure_ascii=False),
        ]
    )
    return buf.getvalue()
