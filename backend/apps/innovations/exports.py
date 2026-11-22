"""Public innovation card exporters (JSON, Markdown, CSV)."""

from __future__ import annotations

import csv
import io
from typing import Any

from .models import Innovation
from .serializers import InnovationDetailSerializer


def build_innovation_export_dict(innovation: Innovation) -> dict[str, Any]:
    """Return public level-2 card payload safe for external export (no private contacts)."""
    return dict(InnovationDetailSerializer(innovation).data)


def render_innovation_markdown(innovation: Innovation) -> str:
    data = build_innovation_export_dict(innovation)
    lines = [
        f"# {data['title_pl']}",
        "",
        f"**Organizacja:** {data['organization_name']} ({data['origin_location']})",
        (
            f"**Obszar:** {data['primary_area']} | "
            f"**Poziom wdrożenia:** {data['deployment_level']} | "
            f"**TRL:** {data.get('trl') or 'nd.'}"
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
            "trl",
            "verification_status",
            "last_verified_at",
            "sources",
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
            data.get("trl") or "",
            data["verification_status"],
            data["last_verified_at"],
            "; ".join(src["url"] for src in data.get("sources", [])),
        ]
    )
    return buf.getvalue()
