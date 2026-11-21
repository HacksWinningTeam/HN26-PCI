"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { Button } from "./button";
import { ChevronDownIcon, ErrorCircleIcon } from "./icons";

export type CardVariant =
  | "outline"
  | "subtle"
  | "surface"
  | "highlighted"
  | "highlighted-lime";

export const CARD_VARIANT_CLASSES: Record<CardVariant, string> = {
  outline: "border border-[var(--color-border)] bg-[var(--color-surface)]",
  subtle: "border border-[var(--color-border-subtle)] bg-[var(--color-surface)]",
  surface:
    "border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]",
  highlighted:
    "border border-[var(--color-info-border)] bg-[var(--color-info-bg)]",
  "highlighted-lime":
    "border border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)]",
};

export type CardSurfaceProps = ComponentPropsWithRef<"div"> & {
  variant?: CardVariant;
  stretch?: boolean;
};

/** Shared base card container used across Card, MetricCard, ScoreBreakdown, and StatePanel. */
export function CardSurface({
  variant = "subtle",
  stretch = false,
  className,
  ...props
}: CardSurfaceProps) {
  return (
    <div
      {...props}
      className={[
        "w-full rounded-xl",
        stretch ? "h-full self-stretch" : "self-start",
        CARD_VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

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
  variant?: CardVariant;
  density?: "default" | "compact";
  stretch?: boolean;
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
  variant = "subtle",
  density = "default",
  stretch = false,
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
        "flex w-full flex-col justify-between gap-4 rounded-xl",
        stretch ? "h-full self-stretch" : "self-start",
        CARD_VARIANT_CLASSES[variant],
        paddingClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-2.5">
        <header className="flex items-start justify-between gap-3">
          <Heading
            id={id}
            className="min-w-0 flex-1 text-base font-bold leading-snug text-[var(--color-text)]"
          >
            {title}
          </Heading>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </header>
        <div>{children}</div>
      </div>

      {footer || actions || secondaryActions ? (
        <footer className="space-y-3 border-t border-[var(--color-border-subtle)] pt-3">
          {footer ? (
            <div className="text-xs text-[var(--color-text-muted)]">{footer}</div>
          ) : null}
          {actions || secondaryActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {secondaryActions}
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
  const disclosureBgClass =
    props.variant === "surface" ||
    props.variant === "highlighted" ||
    props.variant === "highlighted-lime"
      ? "bg-[var(--color-surface)]"
      : "bg-[var(--color-surface-raised)]";

  return (
    <Card
      {...props}
      aria-busy={state === "loading" || undefined}
      actions={ready ? actions : undefined}
      secondaryActions={ready ? secondaryActions : undefined}
      footer={
        ready
          ? footer
          : state === "loading" && footer
            ? (
                <span
                  aria-hidden="true"
                  className="ui-shimmer inline-block h-3 w-44 rounded-full align-middle"
                />
              )
            : undefined
      }
    >
      {state === "loading" ? (
        <div className="space-y-2.5" role="status">
          <span className="sr-only">Ładowanie danych…</span>
          <div
            aria-hidden="true"
            className={[
              "ui-shimmer rounded-lg border border-[var(--color-border-subtle)]",
              prominent ? "h-9 w-24" : "h-8 w-20",
            ].join(" ")}
          />

          {description ? (
            <div aria-hidden="true" className="space-y-1.5 pt-0.5">
              <div className="ui-shimmer h-3.5 w-full rounded-md border border-[var(--color-border-subtle)]" />
              <div className="ui-shimmer h-3.5 w-3/4 rounded-md border border-[var(--color-border-subtle)]" />
            </div>
          ) : null}

          {breakdownSummary || (breakdownItems && breakdownItems.length > 0) ? (
            <div
              aria-hidden="true"
              className={`flex h-9 items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 ${disclosureBgClass}`}
            >
              <div className="ui-shimmer h-3 w-36 rounded-full" />
              <div className="ui-shimmer h-3 w-3 rounded-full" />
            </div>
          ) : null}
        </div>
      ) : state === "error" ? (
        <div
          className="flex flex-col items-center justify-center gap-3 py-4 text-center"
          role="alert"
        >
          <ErrorCircleIcon
            size={22}
            weight="bold"
            className="text-[var(--color-error-badge)]"
          />
          <p className="max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
            {errorMessage}
          </p>
          {onRetry ? (
            <Button size="compact" variant="outline" onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2.5">
          <p
            className={[
              "flex items-baseline gap-1 font-mono font-bold tracking-tight tabular-nums text-[var(--color-text)]",
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
                  <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                    {unit}
                  </span>
                ) : null}
              </>
            )}
          </p>

          {description ? (
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}

          {breakdownItems && breakdownItems.length > 0 ? (
            <details
              className={`group rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-xs ${disclosureBgClass}`}
            >
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
        "cursor-pointer rounded-xl p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
        active
          ? accent === "lime"
            ? "border border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)]"
            : "border border-[var(--color-accent)] bg-[var(--color-info-bg)]"
          : `${CARD_VARIANT_CLASSES.subtle} hover:border-[var(--color-border)]`,
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
