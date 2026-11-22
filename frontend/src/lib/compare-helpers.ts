import type { DropdownOption } from "../components/ui/dropdown";
import type { InnovationDetail, InnovationSummary, MatchItem } from "./radar-api";

export function shortInnovationTitle(title: string): string {
  return title.split("—")[0].trim() || title.trim();
}

export function buildSlotOptions(
  summaries: readonly InnovationSummary[],
  compareSlugs: readonly string[],
  slotIndex: number,
  emptyLabel = "— Wybierz innowację —",
): DropdownOption[] {
  return [
    { value: "", label: emptyLabel },
    ...summaries.map((item) => ({
      value: item.slug,
      label: item.title_pl,
      disabled: compareSlugs.some(
        (slug, index) => index !== slotIndex && slug === item.slug,
      ),
    })),
  ];
}

export function updateCompareSlot(
  compareSlugs: readonly string[],
  slotIndex: number,
  nextSlug: string,
): string[] {
  if (slotIndex < 0 || slotIndex > 2) return [...compareSlugs].slice(0, 3);
  if (!nextSlug) {
    return compareSlugs.filter((_, index) => index !== slotIndex);
  }
  const duplicateAtOtherSlot = compareSlugs.some(
    (slug, index) => index !== slotIndex && slug === nextSlug,
  );
  if (duplicateAtOtherSlot) {
    return [...compareSlugs].slice(0, 3);
  }
  const next = [...compareSlugs];
  if (slotIndex < next.length) {
    next[slotIndex] = nextSlug;
  } else {
    next.push(nextSlug);
  }
  return next.slice(0, 3);
}

export interface ScoreRange {
  min: number;
  max: number;
}

export type ScoreKey =
  | "innovativeness"
  | "application_potential"
  | "transferability"
  | "credibility";

export function computeScoreRanges(
  details: readonly InnovationDetail[],
): Record<ScoreKey, ScoreRange> {
  const keys: ScoreKey[] = [
    "innovativeness",
    "application_potential",
    "transferability",
    "credibility",
  ];
  const result = {} as Record<ScoreKey, ScoreRange>;

  for (const key of keys) {
    const values = details
      .map((detail) => detail.scores?.[key])
      .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
    result[key] =
      values.length === 0
        ? { min: 0, max: 0 }
        : { min: Math.min(...values), max: Math.max(...values) };
  }

  return result;
}

export function computeKeyDifferences(
  details: readonly InnovationDetail[],
  matchBySlug: Record<string, MatchItem>,
  labels: {
    areaLabels: Record<string, string>;
    deploymentLabels: Record<string, string>;
    verificationLabels: Record<string, string>;
  },
): string[] {
  if (details.length < 2) return [];
  const notes: string[] = [];

  const areas = new Set(
    details.map((d) => labels.areaLabels[d.primary_area] ?? d.primary_area),
  );
  if (areas.size > 1) {
    notes.push(`Różne główne obszary: ${[...areas].join(" vs ")}.`);
  }

  const levels = new Set(
    details.map((d) => labels.deploymentLabels[d.deployment_level] ?? d.deployment_level),
  );
  if (levels.size > 1) {
    notes.push(`Różny poziom dojrzałości wdrożeniowej: ${[...levels].join(" / ")}.`);
  }

  const trls = details
    .map((d) => d.trl)
    .filter((trl): trl is number => typeof trl === "number");
  if (trls.length >= 2) {
    const minTrl = Math.min(...trls);
    const maxTrl = Math.max(...trls);
    if (minTrl < maxTrl) {
      notes.push(`Rozpiętość gotowości technologicznej: od TRL ${minTrl}/9 do TRL ${maxTrl}/9.`);
    }
  }

  const nonVerified = details.filter((d) => d.verification_status !== "verified");
  if (nonVerified.length > 0) {
    notes.push(
      `Uwaga na wiarygodność: ${nonVerified
        .map(
          (d) =>
            `${shortInnovationTitle(d.title_pl)} (${
              labels.verificationLabels[d.verification_status] ?? d.verification_status
            })`,
        )
        .join(", ")}.`,
    );
  }

  const sortedByCred = [...details].sort(
    (a, b) => (b.scores?.credibility ?? 0) - (a.scores?.credibility ?? 0),
  );
  const topCred = sortedByCred[0]?.scores?.credibility ?? 0;
  const lowCred = sortedByCred.at(-1)?.scores?.credibility ?? 0;
  if (topCred > lowCred && sortedByCred[0]) {
    notes.push(
      `Najwyższa wiarygodność źródeł: ${shortInnovationTitle(sortedByCred[0].title_pl)} (${topCred}%).`,
    );
  }

  const matchedDetails = details
    .map((detail) => ({
      detail,
      match: matchBySlug[detail.slug],
    }))
    .filter(
      (entry): entry is { detail: InnovationDetail; match: MatchItem } =>
        Boolean(entry.match),
    )
    .sort((a, b) => b.match.overall_score - a.match.overall_score);

  if (
    matchedDetails.length >= 2 &&
    matchedDetails[0].match.overall_score >
      matchedDetails[matchedDetails.length - 1].match.overall_score
  ) {
    notes.push(
      `Najwyższe dopasowanie do opisanego problemu: ${shortInnovationTitle(
        matchedDetails[0].detail.title_pl,
      )} (${matchedDetails[0].match.overall_score}%).`,
    );
  }

  return notes;
}
