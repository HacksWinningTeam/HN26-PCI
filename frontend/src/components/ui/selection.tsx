"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { SpinnerIcon } from "./icons";

export type SelectionOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type CheckboxProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "size" | "children"
> & {
  indeterminate?: boolean;
};

/** Shared checkbox supporting indeterminate mixed state. */
export function Checkbox({
  indeterminate = false,
  className,
  ref,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      {...props}
      aria-checked={indeterminate ? "mixed" : props["aria-checked"]}
      ref={(element) => {
        if (element) element.indeterminate = indeterminate;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
      }}
      className={[
        "h-4 w-4 shrink-0 cursor-pointer rounded accent-[var(--color-accent)] disabled:cursor-not-allowed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

type GroupProps = {
  label: string;
  options: readonly SelectionOption[];
  name?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  accent?: "cyan" | "lime";
};

export type RadioGroupProps = GroupProps & {
  layout?: "vertical" | "horizontal" | "cards";
  value: string;
  onValueChange: (value: string) => void;
};

export type CheckboxGroupProps = GroupProps & {
  layout?: "vertical" | "horizontal" | "pills";
  value: string[];
  onValueChange: (value: string[]) => void;
};

function Choices({
  label,
  options,
  name,
  hint,
  error,
  disabled,
  className,
  value,
  onValueChange,
  multiple = false,
  segmented = false,
  layout = "vertical",
  accent = "cyan",
}: GroupProps & {
  value: string[];
  onValueChange: (value: string[]) => void;
  multiple?: boolean;
  segmented?: boolean;
  layout?: "vertical" | "horizontal" | "cards" | "pills";
}) {
  const id = useId();
  const groupName = name ?? id;
  const isPills = layout === "pills";
  const isCards = layout === "cards";

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={
        [hint && `${id}-hint`, error && `${id}-error`]
          .filter(Boolean)
          .join(" ") || undefined
      }
      aria-invalid={error ? true : undefined}
      className={["space-y-2 border-0 p-0 m-0", className]
        .filter(Boolean)
        .join(" ")}
    >
      <legend className="text-xs font-semibold text-[var(--color-text)]">
        {label}
      </legend>

      <div
        className={
          segmented
            ? "inline-flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1"
            : isPills
              ? "flex flex-wrap gap-2"
              : isCards
                ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
                : layout === "horizontal"
                  ? "flex flex-wrap gap-3"
                  : "flex flex-col gap-2"
        }
      >
        {options.map((option, index) => {
          const isSelected = value.includes(option.value);
          const isOptionDisabled = Boolean(disabled || option.disabled);
          const labelId = `${id}-${index}-label`;
          const descId = option.description ? `${id}-${index}-desc` : undefined;

          const isLime = accent === "lime";
          const itemClass = segmented
            ? [
                "inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-focus)]",
                isSelected
                  ? isLime
                    ? "bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)] shadow-xs"
                    : "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-xs"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface)]",
                isOptionDisabled && "cursor-not-allowed opacity-50",
              ]
                .filter(Boolean)
                .join(" ")
            : isPills
              ? [
                  "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                  isSelected
                    ? isLime
                      ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] font-semibold text-[var(--color-accent-lime-text)]"
                      : "border-[var(--color-accent)] bg-[var(--color-info-bg)] font-semibold text-[var(--color-info-text)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-border)]",
                  isOptionDisabled && "cursor-not-allowed opacity-50",
                ]
                  .filter(Boolean)
                  .join(" ")
              : [
                  "flex min-h-11 cursor-pointer items-start gap-2.5 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors",
                  isSelected
                    ? isLime
                      ? "border-[var(--color-accent-lime-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                      : "border-[var(--color-accent)] bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border)]",
                  isOptionDisabled && "cursor-not-allowed opacity-50",
                ]
                  .filter(Boolean)
                  .join(" ");

          return (
            <label key={option.value} className={itemClass}>
              {multiple ? (
                <Checkbox
                  name={groupName}
                  value={option.value}
                  checked={isSelected}
                  disabled={option.disabled}
                  aria-labelledby={labelId}
                  aria-describedby={descId}
                  className={[
                    isPills ? "" : "mt-0.5",
                    isLime ? "accent-[var(--color-accent-lime-border)]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onChange={() =>
                    onValueChange(
                      isSelected
                        ? value.filter((item) => item !== option.value)
                        : [...value, option.value],
                    )
                  }
                />
              ) : (
                <input
                  type="radio"
                  name={groupName}
                  value={option.value}
                  checked={isSelected}
                  disabled={option.disabled}
                  aria-labelledby={labelId}
                  aria-describedby={!segmented ? descId : undefined}
                  onChange={() => onValueChange([option.value])}
                  className={
                    segmented
                      ? "sr-only outline-none focus-visible:outline-none"
                      : isLime
                        ? "mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent-lime-border)]"
                        : "mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-accent)]"
                  }
                />
              )}

              <span className="flex min-w-0 flex-col">
                <span
                  id={labelId}
                  className="inline-flex items-center gap-1.5 font-medium leading-snug"
                >
                  {option.icon ? (
                    <span className="inline-flex shrink-0" aria-hidden="true">
                      {option.icon}
                    </span>
                  ) : null}
                  <span>{option.label}</span>
                </span>
                {!segmented && !isPills && option.description ? (
                  <span
                    id={descId}
                    className="mt-0.5 text-xs text-[var(--color-text-muted)]"
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          aria-live="polite"
          className="text-xs font-semibold text-[var(--color-error-text)]"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function RadioGroup({
  value,
  onValueChange,
  ...props
}: RadioGroupProps) {
  return (
    <Choices
      {...props}
      value={value ? [value] : []}
      onValueChange={(next) => {
        if (next[0] !== undefined) onValueChange(next[0]);
      }}
    />
  );
}

export function SegmentedControl({
  value,
  onValueChange,
  ...props
}: Omit<RadioGroupProps, "layout">) {
  return (
    <Choices
      {...props}
      segmented
      value={value ? [value] : []}
      onValueChange={(next) => {
        if (next[0] !== undefined) onValueChange(next[0]);
      }}
    />
  );
}

export function CheckboxGroup(props: CheckboxGroupProps) {
  return <Choices {...props} multiple />;
}

export type SwitchProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "size" | "children" | "readOnly" | "role"
> & {
  label: string;
  hint?: string;
  error?: string;
  pending?: boolean;
  pendingLabel?: string;
  accent?: "cyan" | "lime";
};

/** Toggle switch with async pending indicator that blocks double-toggles. */
export function Switch({
  label,
  hint,
  error,
  id,
  className,
  pending = false,
  pendingLabel = "Zapisywanie…",
  accent = "cyan",
  onChange,
  onClick,
  checked,
  defaultChecked,
  disabled,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isDisabled = Boolean(pending || disabled);
  const describedBy =
    [
      props["aria-describedby"],
      hint && `${inputId}-hint`,
      error && `${inputId}-error`,
      pending && `${inputId}-pending`,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={inputId}
        className={[
          "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-border)]",
          isDisabled && "cursor-not-allowed opacity-65",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span>
          {label}
          {props.required ? (
            <span className="font-normal text-[var(--color-text-muted)]">
              {" "}
              (wymagane)
            </span>
          ) : null}
        </span>

        <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input
            {...props}
            id={inputId}
            type="checkbox"
            role="switch"
            checked={checked}
            defaultChecked={defaultChecked}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-busy={pending || undefined}
            aria-disabled={isDisabled || props["aria-disabled"] || undefined}
            onClick={(event) => {
              if (pending) {
                event.preventDefault();
                return;
              }
              onClick?.(event);
            }}
            onChange={(event) => {
              if (!pending) onChange?.(event);
            }}
            className="peer sr-only outline-none focus-visible:outline-none"
          />
          <span
            aria-hidden="true"
            className={[
              "h-6 w-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus)]",
              accent === "lime"
                ? "peer-checked:border-[var(--color-on-accent-lime)] peer-checked:bg-[var(--color-accent-lime)]"
                : "peer-checked:border-[var(--color-on-accent)] peer-checked:bg-[var(--color-accent)]",
            ].join(" ")}
          />
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute left-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] transition-transform peer-checked:translate-x-5",
              accent === "lime"
                ? "peer-checked:border-[var(--color-on-accent-lime)] peer-checked:bg-[var(--color-on-accent-lime)] peer-checked:text-[var(--color-accent-lime)]"
                : "peer-checked:border-[var(--color-on-accent)] peer-checked:bg-[var(--color-on-accent)] peer-checked:text-[var(--color-accent)]",
            ].join(" ")}
          >
            {pending ? <SpinnerIcon size={12} /> : null}
          </span>
        </span>
      </label>

      <span id={`${inputId}-pending`} className="sr-only" role="status">
        {pending ? `${label}: ${pendingLabel}` : ""}
      </span>
      {hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${inputId}-error`}
          aria-live="polite"
          className="text-xs font-semibold text-[var(--color-error-text)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
