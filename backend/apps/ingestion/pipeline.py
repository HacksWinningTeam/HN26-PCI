"""Ingestion pipeline: normalization, deduplication, change/conflict & stale detection."""

from __future__ import annotations

import difflib
import re
import unicodedata
import urllib.error
from datetime import timedelta
from typing import Any

from django.utils import timezone
from django.utils.text import slugify

from apps.discovery.models import ScoringConfig
from apps.innovations.models import Evidence, Innovation, InnovationSource

from .adapters import RawSourceRecord, fetch_feed_records
from .ai_service import extract_and_classify_innovation, normalize_whitespace
from .models import IngestionRun, InnovationAuditLog, SourceFeed


def _norm_key(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    ascii_only = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", ascii_only).strip()


def _unique_slug(title: str) -> str:
    base = slugify(title)[:95] or "innowacja"
    candidate = base
    idx = 2
    while Innovation.objects.filter(slug=candidate).exists():
        candidate = f"{base}-{idx}"
        idx += 1
    return candidate


def find_potential_duplicate(
    title: str,
    organization_name: str,
    *,
    exclude_id: int | None = None,
) -> tuple[Innovation | None, int]:
    """Return the closest active innovation if title+organization similarity >= 72%."""
    target_key = _norm_key(title)
    target_org = _norm_key(organization_name)
    best_match: Innovation | None = None
    best_score = 0

    candidates = Innovation.objects.filter(is_merged=False, duplicate_of__isnull=True)
    if exclude_id is not None:
        candidates = candidates.exclude(pk=exclude_id)

    for existing in candidates:
        title_ratio = difflib.SequenceMatcher(
            None, target_key, _norm_key(existing.title_pl)
        ).ratio()
        org_ratio = difflib.SequenceMatcher(
            None, target_org, _norm_key(existing.organization_name)
        ).ratio()
        combined = round((0.75 * title_ratio + 0.25 * org_ratio) * 100)
        if combined > best_score:
            best_score = combined
            best_match = existing

    if best_match is not None and best_score >= 72:
        return best_match, best_score
    return None, best_score


def ingest_raw_record(
    record: RawSourceRecord,
    *,
    actor: str = "system_ingestion",
) -> tuple[Innovation, str]:
    """Normalize, enrich, and upsert a single raw source record.

    Returns (innovation, outcome) where outcome is one of:
    'created', 'updated', 'unchanged', 'duplicate', 'conflict'.
    """
    today = timezone.localdate()
    snapshot = normalize_whitespace(f"{record.title}. {record.text}")[:6000]
    new_hash = InnovationSource.compute_hash(snapshot)

    existing_source = (
        InnovationSource.objects.select_related("innovation")
        .filter(url=record.url, innovation__is_merged=False)
        .first()
    )

    extracted = extract_and_classify_innovation(
        record.text,
        title_hint=record.title,
        organization_hint=record.organization_name,
        source_registry=record.registry,
        url=record.url,
        metadata=record.metadata,
    )

    if existing_source is not None:
        inv = existing_source.innovation
        if existing_source.content_hash == new_hash:
            existing_source.last_verified_at = today
            existing_source.is_available = True
            existing_source.save(update_fields=["last_verified_at", "is_available"])
            return inv, "unchanged"

        conflicts = list(inv.conflicting_info or [])
        outcome = "updated"
        if (
            extracted["trl"] is not None
            and inv.trl is not None
            and extracted["trl"] != inv.trl
        ):
            conflict_msg = (
                f"Źródło {record.registry} wskazuje TRL {extracted['trl']}, "
                f"podczas gdy w rekordzie zapisano TRL {inv.trl}."
            )
            if conflict_msg not in conflicts:
                conflicts.append(conflict_msg)
            inv.verification_status = "conflict"
            outcome = "conflict"

        changes: dict[str, Any] = {
            "source_content_hash": {"old": existing_source.content_hash, "new": new_hash}
        }
        if extracted["short_summary_pl"] and extracted["short_summary_pl"] != inv.short_summary_pl:
            changes["short_summary_pl"] = {
                "old": inv.short_summary_pl,
                "new": extracted["short_summary_pl"],
            }
            inv.short_summary_pl = extracted["short_summary_pl"]
        inv.conflicting_info = conflicts
        inv.fetched_at = today
        inv.save()

        existing_source.raw_snapshot = snapshot
        existing_source.content_hash = new_hash
        existing_source.fetched_at = today
        existing_source.last_verified_at = today
        existing_source.is_available = True
        existing_source.save()

        InnovationAuditLog.objects.create(
            innovation=inv,
            action="ingest",
            actor=actor,
            verification_method=f"Automatyczna aktualizacja ze źródła {record.registry}",
            changes=changes,
            note="Wykryto zmianę treści w materiale źródłowym.",
        )
        return inv, outcome

    dup_target, similarity_pct = find_potential_duplicate(
        extracted["title_pl"],
        extracted["organization_name"],
    )

    verification_status = "pending_review"
    verification_method = f"Pozyskano automatycznie ze źródła {record.registry}"
    outcome = "created"
    if dup_target is not None:
        verification_method = f"Potencjalny duplikat (podobieństwo {similarity_pct}%)"
        outcome = "duplicate"

    inv = Innovation.objects.create(
        slug=_unique_slug(extracted["title_pl"]),
        title_pl=extracted["title_pl"][:255],
        title_en=extracted["title_en"][:255],
        short_summary_pl=extracted["short_summary_pl"],
        short_summary_en=extracted["short_summary_en"],
        problem_pl=extracted["problem_pl"],
        problem_en=extracted["problem_en"],
        solution_pl=extracted["solution_pl"],
        solution_en=extracted["solution_en"],
        primary_area=extracted["primary_area"],
        innovation_character=extracted["innovation_character"],
        sectors=extracted["sectors"],
        beneficiary_groups=extracted["beneficiary_groups"],
        target_org_types=extracted["target_org_types"],
        tags=extracted["tags"],
        organization_name=extracted["organization_name"][:255],
        organization_type=extracted["organization_type"],
        origin_location=extracted["origin_location"][:120],
        deployment_level=extracted["deployment_level"],
        trl=extracted["trl"],
        oslo_compliant=extracted["oslo_compliant"],
        oslo_assessment=extracted["oslo_assessment"],
        classification_provenance=extracted["classification_provenance"],
        radar_user_types=extracted["radar_user_types"],
        patent_status=extracted["patent_status"],
        verification_status=verification_status,
        verification_method=verification_method,
        is_public=True,
        is_incomplete=extracted["is_incomplete"],
        is_synthetic_demo=bool(record.metadata.get("is_synthetic_demo", False)),
        fetched_at=today,
        last_verified_at=today,
        scores={
            "innovativeness": 70,
            "application_potential": 72,
            "transferability": 68,
            "credibility": 65,
        },
        missing_info=extracted["missing_info"],
        conflicting_info=extracted["conflicting_info"],
        duplicate_of=dup_target,
    )

    src = InnovationSource.objects.create(
        innovation=inv,
        label=record.label[:255],
        registry=record.registry[:120],
        url=record.url[:500],
        fetched_at=today,
        last_verified_at=today,
        is_available=True,
        raw_snapshot=snapshot,
        content_hash=new_hash,
    )

    for ev in extracted["evidences"]:
        Evidence.objects.create(
            innovation=inv,
            kind=ev["kind"],
            text_pl=ev["text_pl"],
            text_en=ev["text_en"],
            source=src if ev["kind"] == "source_declaration" else None,
            confidence=ev.get("confidence", ""),
            limitation_note=ev.get("limitation_note", ""),
        )

    InnovationAuditLog.objects.create(
        innovation=inv,
        action="ingest",
        actor=actor,
        verification_method=verification_method,
        changes={"slug": {"old": None, "new": inv.slug}},
        note=f"Utworzono rekord ze źródła {record.registry}.",
    )
    return inv, outcome


def mark_stale_innovations() -> int:
    """Flag verified innovations older than stale_after_days as stale."""
    config = ScoringConfig.get_active()
    rules = config.classification_rules if isinstance(config.classification_rules, dict) else {}
    stale_days = int(rules.get("stale_after_days", 180) or 180)
    cutoff = timezone.localdate() - timedelta(days=stale_days)

    stale_qs = Innovation.objects.filter(
        is_merged=False,
        verification_status="verified",
        last_verified_at__lte=cutoff,
    )
    count = stale_qs.update(
        verification_status="stale",
        verification_method=f"Rekord nieodświeżany od > {stale_days} dni",
    )
    return count


def _records_from_feed_config(feed: SourceFeed) -> list[RawSourceRecord]:
    cfg = feed.config if isinstance(feed.config, dict) else {}
    sample_items = cfg.get("sample_items") or []
    records: list[RawSourceRecord] = []
    for item in sample_items:
        if not isinstance(item, dict):
            continue
        records.append(
            RawSourceRecord(
                title=str(item.get("title") or feed.name),
                text=str(item.get("text") or ""),
                url=str(item.get("url") or feed.url),
                registry=str(item.get("registry") or feed.name.split("—")[0].strip()),
                label=str(item.get("label") or item.get("title") or feed.name),
                organization_name=str(item.get("organization_name") or ""),
                metadata=item.get("metadata") if isinstance(item.get("metadata"), dict) else {},
            )
        )
    return records


def run_ingestion_pipeline(
    *,
    feed_ids: list[int] | None = None,
    live_fetch: bool = False,
    actor: str = "system_ingestion",
) -> IngestionRun:
    """Execute ingestion across configured SourceFeeds, detect duplicates/stale, and log run."""
    now = timezone.now()
    feeds = SourceFeed.objects.all()
    if feed_ids:
        feeds = feeds.filter(id__in=feed_ids)

    new_records = 0
    updated_records = 0
    duplicates_found = 0
    conflicts_found = 0
    errors_count = 0

    for feed in feeds:
        cfg = feed.config if isinstance(feed.config, dict) else {}
        if feed.status == "error" and not live_fetch and not cfg.get("sample_items"):
            errors_count += 1
            continue

        try:
            if live_fetch or cfg.get("live_fetch"):
                raw_records = fetch_feed_records(
                    url=feed.url,
                    method=feed.method,
                    registry=feed.name.split("—")[0].strip(),
                    label=feed.name,
                )
            else:
                raw_records = _records_from_feed_config(feed)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            feed.status = "error"
            feed.error_message = f"Błąd pobierania: {exc}"
            feed.save(update_fields=["status", "error_message"])
            errors_count += 1
            continue

        processed = 0
        feed_new = 0
        for rec in raw_records:
            _, outcome = ingest_raw_record(rec, actor=actor)
            processed += 1
            if outcome == "created":
                new_records += 1
                feed_new += 1
            elif outcome == "updated":
                updated_records += 1
            elif outcome == "duplicate":
                new_records += 1
                feed_new += 1
                duplicates_found += 1
            elif outcome == "conflict":
                updated_records += 1
                conflicts_found += 1

        feed.last_synced_at = now
        if feed_new > 0:
            feed.records_count = feed.records_count + feed_new
        if feed.status == "error":
            feed.status = "active"
            feed.error_message = ""
        feed.save(update_fields=["last_synced_at", "records_count", "status", "error_message"])

    stale_marked = mark_stale_innovations()
    if stale_marked > 0:
        SourceFeed.objects.filter(category="Administracja i edukacja").update(
            status="stale",
            error_message=f"Wykryto {stale_marked} nieaktualnych rekordów (> 180 dni).",
        )

    status_value = "completed_with_warnings" if (errors_count or conflicts_found) else "completed"
    summary_parts = [
        f"Nowe: {new_records}",
        f"zaktualizowane: {updated_records}",
        f"duplikaty: {duplicates_found}",
        f"sprzeczności: {conflicts_found}",
        f"nieaktualne: {stale_marked}",
        f"błędy źródeł: {errors_count}",
    ]
    run = IngestionRun.objects.create(
        status=status_value,
        new_records=new_records,
        updated_records=updated_records,
        errors_count=errors_count,
        summary="; ".join(summary_parts) + ".",
    )
    return run
