export interface FiveScaleRating {
  segments: number;
  fiveScaleLabel: string;
  percent: number | null;
}

export function scoreToFiveScale(score: number | undefined | null): FiveScaleRating {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return { segments: 0, fiveScaleLabel: "—", percent: null };
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const segments = clamped === 0 ? 0 : Math.max(1, Math.min(5, Math.round(clamped / 20)));
  const fiveScaleLabel = (clamped / 20).toFixed(1).replace(".", ",");
  return { segments, fiveScaleLabel, percent: clamped };
}
