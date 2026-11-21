"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { SpinnerIcon } from "./icons";

export type ButtonVariant = "filled" | "outline" | "ghost";
export type ButtonSize = "default" | "compact";
export type ButtonTone = "neutral" | "lime" | "destructive" | "success";
export type ButtonShape = "rounded" | "pill";

type ButtonBaseProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  shape?: ButtonShape;
  loading?: boolean;
};

export type ButtonProps = ButtonBaseProps & {
  children: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export type IconButtonProps = Omit<ButtonBaseProps, "children" | "aria-label"> & {
  "aria-label": string;
  visibleLabel?: string;
  children: ReactNode;
};

export type ButtonGroupProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "role" | "aria-label"
> & {
  children: ReactNode;
  label: string;
  orientation?: "horizontal" | "vertical";
  layout?: "joined" | "separate";
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const ButtonGroupContext = createContext<Pick<
  ButtonGroupProps,
  "variant" | "size" | "orientation" | "layout"
> | null>(null);

const VARIANT_CLASSES: Record<ButtonTone, Record<ButtonVariant, string>> = {
  neutral: {
    filled:
      "border border-transparent bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]",
    outline:
      "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]",
    ghost:
      "border border-transparent bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]",
  },
  lime: {
    filled:
      "border border-transparent bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)] hover:bg-[var(--color-accent-lime-hover)]",
    outline:
      "border border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] text-[var(--color-accent-lime-text)] hover:opacity-90",
    ghost:
      "border border-transparent bg-transparent text-[var(--color-accent-lime-text)] hover:bg-[var(--color-accent-lime-bg)]",
  },
  destructive: {
    filled:
      "border border-[var(--color-error-border)] bg-[var(--color-error-badge)] text-[var(--color-error-on-badge)] hover:opacity-90",
    outline:
      "border border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)] hover:opacity-90",
    ghost:
      "border border-transparent bg-transparent text-[var(--color-error-text)] hover:bg-[var(--color-error-bg)]",
  },
  success: {
    filled:
      "border border-[var(--color-success-border)] bg-[var(--color-success-badge)] text-[var(--color-success-on-badge)] hover:opacity-90",
    outline:
      "border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)] hover:opacity-90",
    ghost:
      "border border-transparent bg-transparent text-[var(--color-success-text)] hover:bg-[var(--color-success-bg)]",
  },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 py-2 text-sm",
  compact: "min-h-9 px-3 py-1.5 text-xs",
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "min-h-11 min-w-11 p-0",
  compact: "min-h-9 min-w-9 p-0",
};

export function ButtonGroupSeparator() {
  return null;
}

export function ButtonGroup({
  children,
  label,
  orientation = "horizontal",
  layout = "joined",
  variant = "outline",
  size = "default",
  className,
  ...props
}: ButtonGroupProps) {
  const actions = Children.toArray(children).filter(isValidElement);
  const segments: ReactElement[][] = [[]];
  for (const action of actions) {
    if (action.type === ButtonGroupSeparator) {
      if (segments[segments.length - 1].length > 0) {
        segments.push([]);
      }
    } else {
      segments[segments.length - 1].push(action);
    }
  }

  return (
    <ButtonGroupContext value={{ variant, size, orientation, layout }}>
      <div
        {...props}
        role="group"
        aria-label={label}
        className={[
          "inline-flex flex-wrap",
          orientation === "vertical" ? "flex-col items-stretch" : "flex-row items-center",
          layout === "separate" ? "gap-2" : "gap-0",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {segments
          .filter((segment) => segment.length > 0)
          .flatMap((segment, segmentIndex) =>
            segment.map((action, index) => {
              const isJoined = layout === "joined";
              const isFirst = index === 0;
              const isLast = index === segment.length - 1;
              const overlapClass =
                isJoined && !isFirst
                  ? orientation === "vertical"
                    ? "-mt-px"
                    : "-ml-px"
                  : "";
              const separatorGap =
                isJoined && segmentIndex > 0 && isFirst
                  ? orientation === "vertical"
                    ? "mt-2"
                    : "ml-2"
                  : "";
              const radiusClass = !isJoined
                ? ""
                : orientation === "horizontal"
                  ? [
                      !isFirst && "[&>button]:rounded-l-none",
                      !isLast && "[&>button]:rounded-r-none",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : [
                      !isFirst && "[&>button]:rounded-t-none",
                      !isLast && "[&>button]:rounded-b-none",
                    ]
                      .filter(Boolean)
                      .join(" ");

              return (
                <div
                  key={action.key ?? `${segmentIndex}-${index}`}
                  className={[
                    "inline-flex focus-within:relative focus-within:z-10",
                    overlapClass,
                    separatorGap,
                    radiusClass,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {action}
                </div>
              );
            }),
          )}
      </div>
    </ButtonGroupContext>
  );
}

function ButtonBase({
  variant,
  size,
  tone = "neutral",
  shape = "rounded",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  iconOnly = false,
  ...props
}: ButtonBaseProps & { iconOnly?: boolean }) {
  const group = useContext(ButtonGroupContext);
  const resolvedVariant = variant ?? group?.variant ?? "filled";
  const resolvedSize = size ?? group?.size ?? "default";

  return (
    <>
      <button
        {...props}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={[
          "relative inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-55",
          shape === "pill" ? "rounded-full" : "rounded-lg",
          VARIANT_CLASSES[tone][resolvedVariant],
          iconOnly ? ICON_SIZE_CLASSES[resolvedSize] : SIZE_CLASSES[resolvedSize],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={[
            "inline-flex items-center justify-center gap-2",
            loading && "opacity-0",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </span>
        {loading ? (
          <SpinnerIcon
            size={16}
            className="absolute inset-0 m-auto"
          />
        ) : null}
      </button>
      <span role="status" className="sr-only">
        {loading ? "Ładowanie…" : ""}
      </span>
    </>
  );
}

export function Button({
  children,
  leadingIcon,
  trailingIcon,
  ...props
}: ButtonProps) {
  return (
    <ButtonBase {...props}>
      {leadingIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailingIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </ButtonBase>
  );
}

export function IconButton({
  children,
  visibleLabel,
  ...props
}: IconButtonProps) {
  return (
    <ButtonBase
      {...props}
      title={props.title ?? props["aria-label"]}
      iconOnly={!visibleLabel}
    >
      <span className="inline-flex shrink-0 items-center justify-center" aria-hidden="true">
        {children}
      </span>
      {visibleLabel ? <span>{visibleLabel}</span> : null}
    </ButtonBase>
  );
}

export type PillOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type PillSelectionProps = {
  label: string;
  options: readonly PillOption[];
  value: string;
  onValueChange: (value: string) => void;
  size?: ButtonSize;
  accent?: "cyan" | "lime";
  disabled?: boolean;
  className?: string;
};

/** Single-choice pill radiogroup with roving tabindex and arrow/Home/End keyboard navigation. */
export function PillSelection({
  label,
  options,
  value,
  onValueChange,
  size = "default",
  accent = "cyan",
  disabled = false,
  className,
}: PillSelectionProps) {
  const enabled = options.filter((option) => !disabled && !option.disabled);
  const focusValue =
    enabled.find((option) => option.value === value)?.value ?? enabled[0]?.value;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={["inline-flex flex-wrap gap-1.5", className].filter(Boolean).join(" ")}
      onKeyDown={(event) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
            event.key,
          ) ||
          enabled.length === 0
        ) {
          return;
        }
        event.preventDefault();
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        );
        const current = buttons.indexOf(event.target as HTMLButtonElement);
        const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const index =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? enabled.length - 1
              : (current + step + enabled.length) % enabled.length;
        buttons[index]?.focus();
        onValueChange(enabled[index].value);
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={option.value === focusValue ? 0 : -1}
            disabled={disabled || option.disabled}
            onClick={() => onValueChange(option.value)}
            className={[
              "inline-flex cursor-pointer items-center justify-center rounded-full border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50",
              size === "compact" ? "min-h-9 px-3 py-1 text-xs" : "min-h-11 px-4 py-2 text-sm",
              selected
                ? accent === "lime"
                  ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)]"
                  : "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
