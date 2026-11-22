"use client";

import type { ReactNode } from "react";
import {
  BrandBlobCyanIcon,
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandChecklistIcon,
  BrandLayersIcon,
  BrandLightbulbIcon,
  BrandLimeBurstIcon,
  BrandRocketIcon,
  BrandScalesIcon,
  BrandSearchIdeaIcon,
} from "@/components/ui";
import { scoreToFiveScale } from "@/lib/innovation-metrics";
import type { PrimaryArea } from "@/lib/radar-labels";

const AREA_SURFACE_CLASSES: Record<PrimaryArea, string> = {
  technological:
    "border-[var(--color-info-border)]/35 bg-gradient-to-br from-[var(--color-info-bg)] via-[var(--color-surface)] to-[var(--color-accent-lime-bg)]",
  educational:
    "border-[var(--color-accent-lime-border)]/35 bg-gradient-to-br from-[var(--color-accent-lime-bg)] via-[var(--color-surface)] to-[var(--color-info-bg)]",
  administrative:
    "border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-surface-raised)] via-[var(--color-surface)] to-[var(--color-info-bg)]",
};

export function InnovationAreaVisual({
  primaryArea,
  size = "card",
  topLeft,
  topRight,
  bottomLeft,
}: {
  primaryArea: PrimaryArea;
  size?: "card" | "hero";
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
}) {
  const iconSize = size === "hero" ? 88 : 56;
  const secondarySize = size === "hero" ? 56 : 36;
  const minHeightClass = size === "hero" ? "min-h-52 sm:min-h-60" : "h-36";

  return (
    <div
      className={[
        "relative flex w-full items-center justify-center overflow-hidden border-b",
        size === "hero" ? "rounded-2xl border" : "",
        minHeightClass,
        AREA_SURFACE_CLASSES[primaryArea],
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {primaryArea === "technological" ? (
        <>
          <BrandBlobCyanIcon
            size={size === "hero" ? 150 : 100}
            className="pointer-events-none absolute -bottom-8 -left-8 opacity-75"
          />
          <BrandLimeBurstIcon
            size={size === "hero" ? 40 : 28}
            className="pointer-events-none absolute top-4 right-14 opacity-80"
          />
        </>
      ) : primaryArea === "educational" ? (
        <>
          <BrandBlobLimeIcon
            size={size === "hero" ? 150 : 100}
            className="pointer-events-none absolute -right-8 -bottom-8 opacity-70"
          />
          <BrandBlobSoftBlueIcon
            size={size === "hero" ? 120 : 80}
            className="pointer-events-none absolute -top-6 -left-6 opacity-60"
          />
        </>
      ) : (
        <>
          <BrandBlobSoftBlueIcon
            size={size === "hero" ? 150 : 100}
            className="pointer-events-none absolute -right-8 -bottom-8 opacity-75"
          />
          <BrandLimeBurstIcon
            size={size === "hero" ? 36 : 26}
            className="pointer-events-none absolute bottom-4 left-6 -rotate-45 opacity-75"
          />
        </>
      )}

      <div className="relative z-10 flex items-center gap-3">
        {primaryArea === "technological" ? (
          <>
            <BrandLightbulbIcon size={iconSize} />
            <BrandRocketIcon size={secondarySize} />
          </>
        ) : primaryArea === "educational" ? (
          <>
            <BrandSearchIdeaIcon size={iconSize} />
            <BrandChecklistIcon size={secondarySize} />
          </>
        ) : (
          <>
            <BrandLayersIcon size={iconSize} />
            <BrandScalesIcon size={secondarySize} />
          </>
        )}
      </div>

      {topLeft ? (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
          {topLeft}
        </div>
      ) : null}

      {topRight ? (
        <div className="absolute top-2.5 right-2.5 z-20">{topRight}</div>
      ) : null}

      {bottomLeft ? (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-1.5">
          {bottomLeft}
        </div>
      ) : null}
    </div>
  );
}

export function PotentialMeter({
  score,
  label = "Potencjał wdrożenia",
}: {
  score: number | undefined;
  label?: string;
}) {
  const { segments, fiveScaleLabel, percent } = scoreToFiveScale(score);

  return (
    <div className="space-y-1.5" title="Obliczenie systemu na podstawie opisu i dowodów">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--color-text-muted)]">{label}</span>
        <span className="font-mono font-bold tabular-nums text-[var(--color-text)]">
          {percent === null ? "—" : `${fiveScaleLabel} / 5`}
          {percent !== null ? (
            <span className="ml-1.5 font-normal text-[var(--color-text-muted)]">
              ({percent}%)
            </span>
          ) : null}
        </span>
      </div>
      <div
        className="grid grid-cols-5 gap-1.5"
        role="img"
        aria-label={
          percent === null
            ? `${label}: brak danych`
            : `${label}: ${fiveScaleLabel} na 5 (${percent}%)`
        }
      >
        {[1, 2, 3, 4, 5].map((idx) => {
          const filled = idx <= segments;
          return (
            <span
              key={idx}
              aria-hidden="true"
              className={[
                "h-2.5 rounded-sm border transition-colors",
                filled
                  ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime)]"
                  : "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
