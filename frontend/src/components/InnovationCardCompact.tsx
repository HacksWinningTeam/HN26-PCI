"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  InnovationAreaVisual,
  PotentialMeter,
} from "@/components/InnovationVisuals";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  CheckIcon,
  IconButton,
  ShareIcon,
  StarIcon,
  StarSlashedIcon,
} from "@/components/ui";
import {
  removeSavedInnovation,
  saveInnovation,
  type InnovationSummary,
  type MatchItem,
} from "@/lib/radar-api";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
  type PrimaryArea,
} from "@/lib/radar-labels";

const AREA_BADGE_TONE: Record<PrimaryArea, "info" | "lime" | "neutral"> = {
  technological: "info",
  educational: "lime",
  administrative: "neutral",
};

export function InnovationCardCompact({
  innovation,
  match,
  isSaved = false,
  hasPlan = false,
  onSaved,
  onRemoved,
}: {
  innovation: InnovationSummary;
  match?: MatchItem;
  isSaved?: boolean;
  hasPlan?: boolean;
  onSaved?: (slug: string) => void;
  onRemoved?: (slug: string) => void;
}) {
  const router = useRouter();
  const { auth, compareSlugs, toggleCompare } = useSession();
  const [copied, setCopied] = useState(false);
  const [savedOverride, setSavedOverride] = useState<{
    base: boolean;
    value: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const isPinned = compareSlugs.includes(innovation.slug);
  const saved =
    savedOverride && savedOverride.base === isSaved
      ? savedOverride.value
      : isSaved;

  function handleShare() {
    const url = `${window.location.origin}/innovations/${innovation.slug}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggleFavorite() {
    if (!auth.authenticated) {
      router.push(
        `/login?next=${encodeURIComponent(`/innovations/${innovation.slug}`)}`,
      );
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      if (saved) {
        await removeSavedInnovation(innovation.slug);
        setSavedOverride({ base: isSaved, value: false });
        onRemoved?.(innovation.slug);
      } else {
        await saveInnovation(innovation.slug);
        setSavedOverride({ base: isSaved, value: true });
        onSaved?.(innovation.slug);
      }
    } catch {
      // ignore transient toggle errors
    } finally {
      setSaving(false);
    }
  }

  const favoriteLabel = !auth.authenticated
    ? `Zaloguj się, aby dodać do ulubionych: ${innovation.title_pl}`
    : saved
      ? `Usuń z ulubionych: ${innovation.title_pl}`
      : `Dodaj do ulubionych: ${innovation.title_pl}`;

  return (
    <article className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs transition-all hover:border-[var(--color-accent)] hover:shadow-sm">
      <div>
        <InnovationAreaVisual
          primaryArea={innovation.primary_area}
          size="card"
          topLeft={
            <>
              {hasPlan ? (
                <Badge tone="success" size="compact">
                  Plan wdrożenia
                </Badge>
              ) : null}
              {match ? (
                <Badge tone="info" variant="solid" size="compact">
                  {match.overall_score}% dopasowania
                </Badge>
              ) : null}
            </>
          }
          topRight={
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleToggleFavorite()}
              aria-pressed={saved}
              aria-label={favoriteLabel}
              title={
                !auth.authenticated
                  ? "Zaloguj się, aby dodać do ulubionych"
                  : saved
                    ? "Usuń z ulubionych"
                    : "Dodaj do ulubionych"
              }
              className={[
                "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:opacity-60",
                saved
                  ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] text-[var(--color-accent-lime-text)] hover:border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error-border)]"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 text-[var(--color-text)] hover:border-[var(--color-accent)]",
              ].join(" ")}
            >
              {saved ? (
                <StarSlashedIcon size={18} />
              ) : (
                <StarIcon size={18} weight="regular" />
              )}
            </button>
          }
        />

        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={AREA_BADGE_TONE[innovation.primary_area]} size="compact">
              {PRIMARY_AREA_LABELS[innovation.primary_area]}
            </Badge>
            {innovation.innovation_character.slice(0, 2).map((ch) => (
              <Badge key={ch} tone="neutral" variant="outline" size="compact">
                {CHARACTER_LABELS[ch]}
              </Badge>
            ))}
            {innovation.trl !== null ? (
              <Badge tone="neutral" size="compact">
                TRL {innovation.trl}/9
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold leading-snug text-[var(--color-text)]">
              <Link
                href={`/innovations/${innovation.slug}`}
                className="after:absolute after:inset-0 after:z-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                {innovation.title_pl}
              </Link>
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {innovation.short_summary_pl}
            </p>
          </div>

          {match ? (
            <div className="rounded-xl border border-[var(--color-info-border)]/45 bg-[var(--color-info-bg)] p-3 text-xs">
              <p className="font-semibold text-[var(--color-info-text)]">
                Przyczyna dopasowania: {match.primary_reason}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[var(--color-text-muted)]">
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
              <dd className="truncate font-semibold text-[var(--color-text)]">
                {innovation.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Pochodzenie</dt>
              <dd className="truncate font-semibold text-[var(--color-text)]">
                {innovation.origin_location}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Gotowość</dt>
              <dd className="truncate font-semibold text-[var(--color-text)]">
                {DEPLOYMENT_LABELS[innovation.deployment_level]}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Weryfikacja</dt>
              <dd className="truncate font-semibold text-[var(--color-text)]">
                {VERIFICATION_LABELS[innovation.verification_status]}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[var(--color-text-muted)]">Beneficjenci</dt>
              <dd className="truncate font-medium text-[var(--color-text)]">
                {innovation.beneficiary_groups
                  .map((b) => BENEFICIARY_LABELS[b] ?? b)
                  .join(", ") || "—"}
              </dd>
            </div>
          </dl>

          <div className="border-t border-[var(--color-border-subtle)] pt-3">
            <PotentialMeter score={innovation.scores?.application_potential} />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-canvas)]/50 px-5 py-3">
        <Link
          href={`/innovations/${innovation.slug}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          Otwórz szczegóły
        </Link>
        <button
          type="button"
          onClick={() => toggleCompare(innovation.slug)}
          aria-pressed={isPinned}
          className={[
            "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
            isPinned
              ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)]",
          ].join(" ")}
        >
          {isPinned ? <CheckIcon size={14} weight="bold" /> : null}
          <span>{isPinned ? "W porównaniu" : "Porównaj"}</span>
        </button>
        <IconButton
          variant="outline"
          aria-label={copied ? "Skopiowano link" : `Udostępnij: ${innovation.title_pl}`}
          title={copied ? "Skopiowano link" : "Udostępnij link"}
          onClick={handleShare}
        >
          {copied ? <CheckIcon size={16} weight="bold" /> : <ShareIcon size={16} />}
        </IconButton>
      </div>
    </article>
  );
}
