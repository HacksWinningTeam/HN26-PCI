"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { CardSurface, type CardVariant } from "./card";
import { ErrorCircleIcon, SearchIcon, SpinnerIcon } from "./icons";

export type StateAlignment = "center" | "left";

function StatePanel({
  align = "center",
  tone = "neutral",
  variant = "subtle",
  icon,
  title,
  description,
  actions,
  children,
  className,
  role,
  ariaLive,
  ariaBusy,
}: {
  align?: StateAlignment;
  tone?: "neutral" | "accent" | "error";
  variant?: CardVariant;
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "status" | "alert";
  ariaLive?: "polite" | "assertive";
  ariaBusy?: boolean;
}) {
  const isCentered = align === "center";
  const badgeClasses =
    tone === "error"
      ? "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-badge)]"
      : tone === "accent"
        ? "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-accent-text)]"
        : "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]";

  return (
    <CardSurface
      variant={variant}
      role={role}
      aria-live={ariaLive}
      aria-busy={ariaBusy}
      className={[
        "flex flex-col justify-center gap-4 px-6 py-8",
        isCentered ? "items-center text-center" : "items-start text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${badgeClasses}`}
      >
        {icon}
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-base font-bold leading-snug text-[var(--color-text)]">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div
          className={[
            "flex flex-wrap items-center gap-2 pt-1",
            isCentered ? "justify-center" : "justify-start",
          ].join(" ")}
        >
          {actions}
        </div>
      ) : null}

      {children}
    </CardSurface>
  );
}

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  align?: StateAlignment;
  variant?: CardVariant;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  align = "center",
  variant = "subtle",
  actions,
  children,
  className,
}: EmptyStateProps) {
  return (
    <StatePanel
      align={align}
      variant={variant}
      tone="neutral"
      icon={icon ?? <SearchIcon size={20} weight="bold" />}
      title={title}
      description={description}
      actions={actions}
      className={className}
    >
      {children}
    </StatePanel>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "ui-shimmer rounded-md border border-[var(--color-border-subtle)]",
        className,
      ].join(" ")}
    />
  );
}

const CENTERED_SKELETON_WIDTHS = ["mx-auto w-3/4", "w-full", "mx-auto w-5/6"] as const;
const LEFT_SKELETON_WIDTHS = ["w-3/4", "w-full", "w-5/6"] as const;

export function LoadingState({
  label = "Ładowanie danych…",
  description,
  rows = 3,
  align = "center",
  variant = "subtle",
  className,
}: {
  label?: string;
  description?: string;
  rows?: number;
  align?: StateAlignment;
  variant?: CardVariant;
  className?: string;
}) {
  const widths = align === "center" ? CENTERED_SKELETON_WIDTHS : LEFT_SKELETON_WIDTHS;

  return (
    <StatePanel
      role="status"
      ariaLive="polite"
      ariaBusy
      align={align}
      variant={variant}
      tone="accent"
      icon={<SpinnerIcon size={20} weight="bold" />}
      title={label}
      description={description}
      className={className}
    >
      {rows > 0 ? (
        <div className="w-full max-w-sm space-y-2 pt-1">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton
              key={index}
              className={`h-3 rounded-full ${widths[index % widths.length]}`}
            />
          ))}
        </div>
      ) : null}
    </StatePanel>
  );
}

export function ErrorState({
  title = "Nie udało się pobrać danych",
  message,
  onRetry,
  retryLabel = "Spróbuj ponownie",
  secondaryAction,
  align = "center",
  variant = "subtle",
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: ReactNode;
  align?: StateAlignment;
  variant?: CardVariant;
  className?: string;
}) {
  return (
    <StatePanel
      role="alert"
      align={align}
      variant={variant}
      tone="error"
      icon={<ErrorCircleIcon size={20} weight="bold" />}
      title={title}
      description={message}
      className={className}
      actions={
        onRetry || secondaryAction ? (
          <>
            {onRetry ? (
              <Button size="compact" variant="outline" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
            {secondaryAction}
          </>
        ) : undefined
      }
    />
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
            <span className="font-bold tabular-nums text-[var(--color-text)]">
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
      <div className="text-xs font-bold tabular-nums text-[var(--color-text)]">
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
    <CardSurface variant="surface" className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--color-text)] sm:text-sm">
          Przyczyna dopasowania: {primaryReason}
        </p>
        <span
          className={`rounded-md border px-2.5 py-1 text-sm font-bold tabular-nums ${pillClasses}`}
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
              <span className="font-bold tabular-nums text-[var(--color-text)]">
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
    </CardSurface>
  );
}
