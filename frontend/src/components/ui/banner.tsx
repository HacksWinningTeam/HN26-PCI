"use client";

import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { IconButton } from "./button";
import { CARD_VARIANT_CLASSES, type CardVariant } from "./card";
import {
  CheckCircleIcon,
  CloseIcon,
  ErrorCircleIcon,
  InfoIcon,
  WarningIcon,
} from "./icons";

export type BannerTone = "info" | "success" | "warning" | "error";

export type BannerProps = Omit<
  ComponentPropsWithRef<"div">,
  "title" | "children" | "role" | "aria-live"
> & {
  tone?: BannerTone;
  variant?: CardVariant;
  appearance?: "subtle" | "tinted";
  title?: ReactNode;
  children: ReactNode;
  actions?: readonly [ReactElement] | readonly [ReactElement, ReactElement];
  /** Caller owns visibility and focus restoration after dismissal. */
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Static notices stay silent ("off"); dynamic updates use "polite" or "assertive". */
  announcement?: "off" | "polite" | "assertive";
};

const TINTED_TONE_CLASSES: Record<BannerTone, string> = {
  info:
    "border-[var(--color-info-border)] bg-[var(--color-info-bg)] text-[var(--color-info-text)]",
  success:
    "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  warning:
    "border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] text-[var(--color-warn-text)]",
  error:
    "border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]",
};

const ICON_TONE_CLASSES: Record<BannerTone, string> = {
  info: "text-[var(--color-accent-text)]",
  success: "text-[var(--color-accent-lime-text)]",
  warning: "text-[var(--color-warn-badge)]",
  error: "text-[var(--color-error-badge)]",
};

const ICONS = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
  error: ErrorCircleIcon,
} as const;

export function Banner({
  tone = "info",
  variant = "subtle",
  appearance = "subtle",
  title,
  children,
  actions,
  onDismiss,
  dismissLabel = "Zamknij komunikat",
  announcement = "off",
  className,
  ...props
}: BannerProps) {
  const Icon = ICONS[tone];
  const isTinted = appearance === "tinted";

  return (
    <div
      {...props}
      role={
        announcement === "polite"
          ? "status"
          : announcement === "assertive"
            ? "alert"
            : undefined
      }
      className={[
        "flex items-start gap-3.5 rounded-xl p-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
        isTinted
          ? `border ${TINTED_TONE_CLASSES[tone]}`
          : CARD_VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "mt-0.5 inline-flex shrink-0 items-center justify-center",
          !isTinted ? ICON_TONE_CLASSES[tone] : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Icon size={20} weight="bold" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        {title ? (
          <div
            className={
              isTinted
                ? "font-bold leading-snug"
                : "font-bold leading-snug text-[var(--color-text)]"
            }
          >
            {title}
          </div>
        ) : null}
        <div
          className={
            isTinted
              ? "text-xs leading-relaxed sm:text-sm"
              : "text-xs leading-relaxed text-[var(--color-text-muted)] sm:text-sm"
          }
        >
          {children}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            {actions.map((action, index) => (
              <div key={index} className="inline-flex">
                {action}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {onDismiss ? (
        <IconButton
          variant="ghost"
          size="compact"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className="shrink-0"
        >
          <CloseIcon size={16} />
        </IconButton>
      ) : null}
    </div>
  );
}
