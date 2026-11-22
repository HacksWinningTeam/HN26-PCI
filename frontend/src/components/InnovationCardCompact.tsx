"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Badge } from "@/components/ui";
import type { InnovationSummary, MatchItem } from "@/lib/radar-api";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/radar-labels";

export function InnovationCardCompact({
  innovation,
  match,
  isSaved = false,
  hasPlan = false,
}: {
  innovation: InnovationSummary;
  match?: MatchItem;
  isSaved?: boolean;
  hasPlan?: boolean;
}) {
  const { compareSlugs, toggleCompare } = useSession();
  const [copied, setCopied] = useState(false);
  const isPinned = compareSlugs.includes(innovation.slug);

  function handleShare() {
    const url = `${window.location.origin}/innovations/${innovation.slug}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="rounded border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2 py-0.5 font-semibold text-[var(--color-info-text)]">
              {PRIMARY_AREA_LABELS[innovation.primary_area]}
            </span>
            {innovation.innovation_character.map((ch) => (
              <span
                key={ch}
                className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2 py-0.5 text-[var(--color-text-muted)]"
              >
                {CHARACTER_LABELS[ch]}
              </span>
            ))}
            {hasPlan ? (
              <Badge tone="success" size="compact">
                Plan wdrożenia
              </Badge>
            ) : isSaved ? (
              <Badge tone="info" size="compact">
                Zapisana
              </Badge>
            ) : null}
          </div>
          {match ? (
            <span
              className="rounded-md border border-[var(--color-accent)] bg-[var(--color-info-bg)] px-2.5 py-1 font-mono text-sm font-bold text-[var(--color-info-text)]"
              title="Podobieństwo do potrzeb użytkownika"
            >
              {match.overall_score}%
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="text-lg font-bold leading-snug text-[var(--color-text)]">
            <Link
              href={`/innovations/${innovation.slug}`}
              className="hover:text-[var(--color-accent-text)] hover:underline"
            >
              {innovation.title_pl}
            </Link>
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {innovation.short_summary_pl}
          </p>
        </div>

        {match ? (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs">
            <p className="font-semibold text-[var(--color-text)]">
              Przyczyna dopasowania: {match.primary_reason}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3 font-mono text-[var(--color-text-muted)]">
              <span>Problem (40%): {match.problem_score}%</span>
              <span>Branża (20%): {match.sector_score}%</span>
              <span>Beneficjenci (20%): {match.beneficiary_score}%</span>
              <span>Organizacja (20%): {match.organization_fit_score}%</span>
            </div>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div>
            <dt className="text-[var(--color-text-muted)]">Branża</dt>
            <dd className="font-medium text-[var(--color-text)]">
              {innovation.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Lokalizacja pochodzenia</dt>
            <dd className="font-medium text-[var(--color-text)]">
              {innovation.origin_location}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Poziom wdrożenia</dt>
            <dd className="font-medium text-[var(--color-text)]">
              {DEPLOYMENT_LABELS[innovation.deployment_level]}
              {innovation.trl !== null ? ` · TRL ${innovation.trl}/9` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">Status / Aktualizacja</dt>
            <dd className="font-medium text-[var(--color-text)]">
              {VERIFICATION_LABELS[innovation.verification_status]} ·{" "}
              {innovation.last_verified_at}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[var(--color-text-muted)]">Grupy beneficjentów</dt>
            <dd className="font-medium text-[var(--color-text)]">
              {innovation.beneficiary_groups
                .map((b) => BENEFICIARY_LABELS[b] ?? b)
                .join(", ") || "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        <Link
          href={`/innovations/${innovation.slug}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
        >
          Otwórz szczegóły
        </Link>
        <button
          type="button"
          onClick={() => toggleCompare(innovation.slug)}
          aria-pressed={isPinned}
          className={`min-h-11 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${
            isPinned
              ? "border-[var(--color-accent)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
          }`}
        >
          {isPinned ? "W porównaniu ✓" : "Dodaj do porównania"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {copied ? "Skopiowano" : "Udostępnij"}
        </button>
      </div>
    </article>
  );
}
