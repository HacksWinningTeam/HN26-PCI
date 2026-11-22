from __future__ import annotations

from typing import Any

from .models import ImplementationPlan, ImplementationStep


def has_started_pilot(
    plan: ImplementationPlan,
    steps: list[ImplementationStep] | None = None,
) -> bool:
    """Return True when an implementation plan has progressed into pilot/execution or reporting."""
    if plan.pilot_started_at is not None:
        return True
    if plan.adopter_deployment_status in {"in_pilot", "deployed"}:
        return True
    if plan.pci_transfer_status in {"deployment_confirmed", "effect_verified"}:
        return True
    resolved_steps = list(plan.steps.all()) if steps is None else steps
    return any(
        step.phase_number >= 3 and step.status in {"in_progress", "completed"}
        for step in resolved_steps
    )


def is_awaiting_pci_review(plan: ImplementationPlan) -> bool:
    """Return True when an adopter submitted deployment/outcome data not yet reviewed by PCI."""
    if plan.pci_transfer_status != "unverified":
        return False
    return bool(
        plan.adopter_deployment_status in {"in_pilot", "deployed"}
        or plan.outcome_summary.strip()
        or plan.reached_beneficiaries_count is not None
        or plan.evidence_url.strip()
    )


def derive_transfer_stage(
    plan: ImplementationPlan,
    steps: list[ImplementationStep],
) -> tuple[str, str]:
    """Classify the current real transfer stage for a plan."""
    if plan.pci_transfer_status == "effect_verified":
        return "effect_verified", "Zweryfikowany efekt"
    if (
        plan.pci_transfer_status == "deployment_confirmed"
        or plan.adopter_deployment_status == "deployed"
    ):
        return "deployed", "Wdrożenie"
    if plan.adopter_deployment_status == "stopped":
        return "stopped", "Wstrzymano"
    if has_started_pilot(plan, steps):
        if plan.variant == "validation" and plan.adopter_deployment_status != "in_pilot":
            return "validation", "Walidacja"
        return "pilot", "Pilotaż"
    if plan.variant == "validation":
        return "validation", "Walidacja"
    return "planning", "Przygotowanie planu"


def serialize_transfer_row(plan: ImplementationPlan) -> dict[str, Any]:
    """Serialize a single ImplementationPlan into an Impact Radar transfer row."""
    steps = list(plan.steps.all())
    completed = [step for step in steps if step.status == "completed"]
    in_progress = [step for step in steps if step.status == "in_progress"]
    current_phase = (
        in_progress[0].phase_number
        if in_progress
        else min(5, len(completed) + 1)
    )
    snap = plan.organization_snapshot or {}
    stage_key, stage_label = derive_transfer_stage(plan, steps)

    return {
        "plan_id": plan.id,
        "user_email": plan.user.email,
        "user_name": plan.user.get_full_name() or plan.user.username,
        "organization_name": snap.get("organization_name") or "Niepodana",
        "organization_type": snap.get("organization_type") or "",
        "deployment_location": snap.get("deployment_location") or "",
        "innovation_slug": plan.innovation.slug,
        "innovation_title": plan.innovation.title_pl,
        "primary_area": plan.innovation.primary_area,
        "variant": plan.variant,
        "stage_key": stage_key,
        "stage_label": stage_label,
        "current_phase": current_phase,
        "completed_steps_count": len(completed),
        "total_steps_count": len(steps),
        "pilot_started_at": plan.pilot_started_at,
        "adopter_deployment_status": plan.adopter_deployment_status,
        "deployment_started_on": plan.deployment_started_on,
        "reached_beneficiaries_count": plan.reached_beneficiaries_count,
        "outcome_summary": plan.outcome_summary,
        "evidence_url": plan.evidence_url,
        "deployment_reported_at": plan.deployment_reported_at,
        "pci_transfer_status": plan.pci_transfer_status,
        "pci_transfer_note": plan.pci_transfer_note,
        "pci_transfer_verified_at": plan.pci_transfer_verified_at,
        "awaiting_pci_review": is_awaiting_pci_review(plan),
        "updated_at": plan.updated_at,
    }


def build_impact_radar_payload() -> dict[str, Any]:
    """Aggregate live 4-stage funnel counts and active transfers strictly from database records."""
    plans = list(
        ImplementationPlan.objects.select_related("user", "innovation")
        .prefetch_related("steps")
        .order_by("-updated_at")
    )

    rows: list[dict[str, Any]] = []
    started_pilots = 0
    confirmed_deployments = 0
    verified_effects = 0
    awaiting_pci_review = 0
    total_reached_beneficiaries = 0

    for plan in plans:
        row = serialize_transfer_row(plan)
        rows.append(row)
        if has_started_pilot(plan, list(plan.steps.all())):
            started_pilots += 1
        if plan.pci_transfer_status in {"deployment_confirmed", "effect_verified"}:
            confirmed_deployments += 1
            if plan.reached_beneficiaries_count:
                total_reached_beneficiaries += plan.reached_beneficiaries_count
        if plan.pci_transfer_status == "effect_verified":
            verified_effects += 1
        if row["awaiting_pci_review"]:
            awaiting_pci_review += 1

    rows.sort(
        key=lambda item: (
            not item["awaiting_pci_review"],
            -item["updated_at"].timestamp(),
        )
    )

    return {
        "funnel": {
            "created_plans": len(plans),
            "started_pilots": started_pilots,
            "confirmed_deployments": confirmed_deployments,
            "verified_effects": verified_effects,
            "awaiting_pci_review": awaiting_pci_review,
            "total_reached_beneficiaries": total_reached_beneficiaries,
        },
        "transfers": rows,
    }
