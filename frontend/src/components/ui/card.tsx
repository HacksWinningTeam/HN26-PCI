"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { Button } from "./button";
import { ChevronDownIcon, ErrorCircleIcon, SpinnerIcon } from "./icons";

export type CardProps = Omit<
  ComponentPropsWithRef<"article">,
  "title" | "children"
> & {
  title: string;
  children: ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
  badge?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  variant?: "outline" | "surface" | "highlighted" | "highlighted-lime";
  density?: "default" | "compact";
};

const CARD_VARIANT_CLASSES: Record<NonNullable<CardProps["variant"]>, string> = {
  outline: "border border-[var(--color-border)] bg-[var(--color-surface)]",
  surface:
    "border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]",
  highlighted:
    "border-2 border-[var(--color-accent)] bg-[var(--color-surface)]",
  "highlighted-lime":
    "border-2 border-[var(--color-accent-lime-border)] bg-[var(--color-surface)]",
};

/** Semantic display container with header badge, body, and explicit action footer. */
export function Card({
  title,
  children,
  headingLevel: Heading = "h3",
  badge,
  footer,
  actions,
  secondaryActions,
  variant = "outline",
  density = "default",
  className,
  ...props
}: CardProps) {
  const id = useId();
  const paddingClass = density === "compact" ? "p-4" : "p-5";

  return (
    <article
      aria-labelledby={id}
      {...props}
      className={[
        "flex flex-col justify-between gap-4 rounded-xl",
        CARD_VARIANT_CLASSES[variant],
        paddingClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-3">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <Heading
            id={id}
            className="text-base font-bold leading-snug text-[var(--color-text)] sm:text-lg"
          >
            {title}
          </Heading>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </header>
        <div>{children}</div>
      </div>

      {footer || actions || secondaryActions ? (
        <footer className="space-y-2 border-t border-[var(--color-border-subtle)] pt-3">
          {footer ? (
            <div className="text-xs text-[var(--color-text-muted)]">{footer}</div>
          ) : null}
          {actions || secondaryActions ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
              {secondaryActions ? (
                <div className="flex flex-wrap items-center gap-2">
                  {secondaryActions}
                </div>
              ) : null}
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

export type MetricCardDetail = {
  label: string;
  value: string;
};

export type MetricCardProps = Omit<CardProps, "children"> & {
  value: string | number | null;
  unit?: string;
  description?: string;
  prominent?: boolean;
  /** Expandable provenance / breakdown details inside the card. */
  breakdownSummary?: string;
  breakdownItems?: readonly MetricCardDetail[];
  state?: "ready" | "loading" | "error";
  errorMessage?: string;
  onRetry?: () => void;
};

/** Metric summary card with tabular numerals, loading/error states, and optional details disclosure. */
export function MetricCard({
  value,
  unit,
  description,
  prominent = false,
  breakdownSummary,
  breakdownItems,
  state = "ready",
  errorMessage = "Nie udało się wczytać wartości.",
  onRetry,
  actions,
  secondaryActions,
  footer,
  ...props
}: MetricCardProps) {
  const ready = state === "ready";

  return (
    <Card
      {...props}
      aria-busy={state === "loading" || undefined}
      actions={ready ? actions : undefined}
      secondaryActions={ready ? secondaryActions : undefined}
      footer={ready ? footer : undefined}
    >
      {state === "loading" ? (
        <div
          className="flex flex-col items-center justify-center gap-2.5 py-4 text-center"
          role="status"
        >
          <div
            aria-hidden="true"
            className="ui-shimmer h-7 w-28 rounded-md border border-[var(--color-border-subtle)]/50"
          />
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
            <SpinnerIcon size={14} weight="bold" className="text-[var(--color-accent-text)]" />
            <span>Ładowanie danych…</span>
          </div>
        </div>
      ) : state === "error" ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-3 text-center"
          role="alert"
        >
          <div
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-error-border)]/50 bg-[var(--color-error-bg)] text-[var(--color-error-badge)]"
          >
            <ErrorCircleIcon size={18} weight="bold" />
          </div>
          <p className="max-w-xs text-xs font-medium leading-relaxed text-[var(--color-text-muted)]">
            {errorMessage}
          </p>
          {onRetry ? (
            <Button size="compact" variant="outline" onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <p
            className={[
              "font-mono font-bold tabular-nums text-[var(--color-text)]",
              prominent ? "text-3xl" : "text-2xl",
            ].join(" ")}
          >
            {value === null ? (
              <span className="text-base font-medium text-[var(--color-text-muted)]">
                Brak danych
              </span>
            ) : (
              <>
                <span>{value}</span>
                {unit ? (
                  <span className="ml-1.5 text-sm font-semibold text-[var(--color-text-muted)]">
                    {unit}
                  </span>
                ) : null}
              </>
            )}
          </p>

          {description ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}

          {breakdownItems && breakdownItems.length > 0 ? (
            <details className="group rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
                <span>{breakdownSummary ?? "Szczegóły wyliczenia"}</span>
                <ChevronDownIcon
                  size={14}
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <dl className="mt-2 space-y-1 border-t border-[var(--color-border-subtle)] pt-2">
                {breakdownItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <dt className="text-[var(--color-text-muted)]">
                      {item.label}
                    </dt>
                    <dd className="font-mono font-semibold tabular-nums text-[var(--color-text)]">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>
      )}
    </Card>
  );
}

export type StatFilterCardProps = {
  count: number;
  label: string;
  hint?: string;
  active?: boolean;
  accent?: "cyan" | "lime";
  onClick: () => void;
};

/** Interactive metric card acting as a toggleable status filter (used in PCI Admin). */
export function StatFilterCard({
  count,
  label,
  hint,
  active = false,
  accent = "cyan",
  onClick,
}: StatFilterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
        active
          ? accent === "lime"
            ? "border-2 border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)]"
            : "border-2 border-[var(--color-accent)] bg-[var(--color-info-bg)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]",
      ].join(" ")}
    >
      <div className="font-mono text-2xl font-bold tabular-nums text-[var(--color-text)]">
        {count}
      </div>
      <div className="mt-0.5 text-xs font-bold text-[var(--color-text)]">
        {label}
      </div>
      {hint ? (
        <div className="text-[11px] text-[var(--color-text-muted)]">{hint}</div>
      ) : null}
    </button>
  );
}
