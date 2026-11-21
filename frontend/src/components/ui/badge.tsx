import type { ComponentPropsWithRef, ReactNode } from "react";

export type StatusTone = "neutral" | "lime" | "info" | "success" | "warning" | "error";

export type BadgeProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  children: ReactNode;
  tone?: StatusTone;
  variant?: "soft" | "outline" | "solid";
  size?: "default" | "compact";
  leadingIcon?: ReactNode;
};

const SOFT_TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text)]",
  lime:
    "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] text-[var(--color-accent-lime-text)]",
  info:
    "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  success:
    "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  warning:
    "border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] text-[var(--color-warn-text)]",
  error:
    "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
};

const SOLID_TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    "border-transparent bg-[var(--color-text)] text-[var(--color-canvas)]",
  lime:
    "border-transparent bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)]",
  info:
    "border-transparent bg-[var(--color-accent)] text-[var(--color-on-accent)]",
  success:
    "border-transparent bg-[var(--color-success-badge)] text-[var(--color-success-on-badge)]",
  warning:
    "border-transparent bg-[var(--color-warn-badge)] text-[var(--color-warn-on-badge)]",
  error:
    "border-transparent bg-[var(--color-error-badge)] text-[var(--color-error-on-badge)]",
};

const OUTLINE_TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
  lime:
    "border-[var(--color-accent-lime-border)] bg-[var(--color-surface)] text-[var(--color-accent-lime-text)]",
  info:
    "border-[var(--color-info-border)] bg-[var(--color-surface)] text-[var(--color-info-text)]",
  success:
    "border-[var(--color-success-border)] bg-[var(--color-surface)] text-[var(--color-success-text)]",
  warning:
    "border-[var(--color-warn-border)] bg-[var(--color-surface)] text-[var(--color-warn-text)]",
  error:
    "border-[var(--color-error-border)] bg-[var(--color-surface)] text-[var(--color-error-text)]",
};

const DOT_TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-[var(--color-text-muted)]",
  lime: "bg-[var(--color-accent-lime)]",
  info: "bg-[var(--color-accent)]",
  success: "bg-[var(--color-success-badge)]",
  warning: "bg-[var(--color-warn-badge)]",
  error: "bg-[var(--color-error-badge)]",
};

/** Display-only label. Use Button, PillSelection, or Checkbox for interactive actions. */
export function Badge({
  children,
  tone = "neutral",
  variant = "soft",
  size = "default",
  leadingIcon,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none",
        size === "compact" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs",
        variant === "outline"
          ? OUTLINE_TONE_CLASSES[tone]
          : variant === "solid"
            ? SOLID_TONE_CLASSES[tone]
            : SOFT_TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leadingIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}

export type StatusIndicatorProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  children: string;
  tone?: StatusTone;
};

/** Status indicator pairing a colored dot with an always-visible text label (WCAG 2.2 AA). */
export function StatusIndicator({
  children,
  tone = "neutral",
  className,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        SOFT_TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={["inline-block h-2 w-2 shrink-0 rounded-full", DOT_TONE_CLASSES[tone]].join(" ")}
      />
      <span>{children}</span>
    </span>
  );
}
