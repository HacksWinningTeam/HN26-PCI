"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { ErrorCircleIcon, SpinnerIcon } from "./icons";

export type EmptyStateProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actions,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "space-y-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-[var(--color-text)] sm:text-lg">
          {title}
        </h3>
        <p className="max-w-xl text-sm text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      {children}
    </div>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "ui-shimmer rounded-md border border-[var(--color-border-subtle)]/50",
        className,
      ].join(" ")}
    />
  );
}

const SKELETON_ROW_WIDTHS = ["mx-auto w-3/4", "w-full", "mx-auto w-5/6"] as const;

export function LoadingState({
  label = "Ładowanie danych…",
  description,
  rows = 3,
  className,
}: {
  label?: string;
  description?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={[
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-8 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-accent-text)] shadow-xs"
      >
        <SpinnerIcon size={20} weight="bold" />
      </div>

      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      {rows > 0 ? (
        <div className="w-full max-w-sm space-y-2 pt-1">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-3 rounded-full ${SKELETON_ROW_WIDTHS[index % SKELETON_ROW_WIDTHS.length]}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Nie udało się pobrać danych",
  message,
  onRetry,
  retryLabel = "Spróbuj ponownie",
  secondaryAction,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-[var(--color-error-border)]/45 bg-[var(--color-surface)] px-6 py-8 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-error-border)]/50 bg-[var(--color-error-bg)] text-[var(--color-error-badge)]"
      >
        <ErrorCircleIcon size={22} weight="bold" />
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
          {message}
        </p>
      </div>

      {onRetry || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {onRetry ? (
            <Button size="compact" variant="outline" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  accent = "lime",
}: {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  accent?: "cyan" | "lime";
}) {
  const safeMax = Math.max(1, max);
  const clamped = Math.max(0, Math.min(safeMax, value));
  const percent = Math.round((clamped / safeMax) * 100);
  const barToneClass =
    accent === "cyan"
      ? "bg-[var(--color-accent)]"
      : "bg-[var(--color-accent-lime)]";

  return (
    <div className="space-y-1.5">
      {label || showPercent ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          {label ? (
            <span className="font-semibold text-[var(--color-text)]">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showPercent ? (
            <span className="font-mono font-bold tabular-nums text-[var(--color-text)]">
              {percent}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label ?? "Postęp"}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        className="h-2.5 w-full overflow-hidden rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]"
      >
        <div
          className={`h-full rounded-full transition-all ${barToneClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function PhaseStepper({
  totalPhases = 5,
  completedCount,
  currentPhase,
}: {
  totalPhases?: number;
  completedCount: number;
  currentPhase: number;
}) {
  return (
    <div className="space-y-1">
      <div className="font-mono text-xs font-bold tabular-nums text-[var(--color-text)]">
        Etap {currentPhase}/{totalPhases} · Ukończono {completedCount}/
        {totalPhases}
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: totalPhases }, (_, index) => {
          const phase = index + 1;
          const done = phase <= completedCount;
          const current = phase === currentPhase && !done;
          return (
            <span
              key={phase}
              className={[
                "h-2 w-8 rounded-full",
                done
                  ? "bg-[var(--color-success-badge)]"
                  : current
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}

export type ScoreCriterion = {
  label: string;
  weightPercent: number;
  score: number;
  sourceKind?: "evidence" | "declaration" | "missing";
};

/** 40/20/20/20 explainable match breakdown widget for Praktoteka. */
export function ScoreBreakdown({
  overallScore,
  primaryReason,
  criteria,
  accent = "cyan",
}: {
  overallScore: number;
  primaryReason: string;
  criteria: readonly ScoreCriterion[];
  accent?: "cyan" | "lime";
}) {
  const pillClasses =
    accent === "lime"
      ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] text-[var(--color-accent-lime-text)]"
      : "border-[var(--color-accent)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]";
  const fillClass =
    accent === "lime"
      ? "bg-[var(--color-accent-lime)]"
      : "bg-[var(--color-accent)]";

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--color-text)] sm:text-sm">
          Przyczyna dopasowania: {primaryReason}
        </p>
        <span
          className={`rounded-md border px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${pillClasses}`}
        >
          {overallScore}%
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {criteria.map((criterion) => (
          <div
            key={criterion.label}
            className="space-y-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--color-text)]">
                {criterion.label} ({criterion.weightPercent}%)
              </span>
              <span className="font-mono font-bold tabular-nums text-[var(--color-text)]">
                {criterion.score}%
              </span>
            </div>
            <div
              aria-hidden="true"
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]"
            >
              <div
                className={`h-full rounded-full ${fillClass}`}
                style={{ width: `${Math.max(0, Math.min(100, criterion.score))}%` }}
              />
            </div>
            {criterion.sourceKind ? (
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {criterion.sourceKind === "evidence"
                  ? "Źródło: potwierdzone dane"
                  : criterion.sourceKind === "declaration"
                    ? "Źródło: deklaracja / opis"
                    : "Brakujące informacje"}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
