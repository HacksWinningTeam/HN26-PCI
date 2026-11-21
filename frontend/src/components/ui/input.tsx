"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
} from "react";
import { IconButton } from "./button";
import { CloseIcon, SearchIcon } from "./icons";

type NativeInputProps = Omit<ComponentPropsWithRef<"input">, "size" | "children">;

export type TextInputProps = NativeInputProps & {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  size?: "default" | "compact";
};

type FieldProps = TextInputProps & {
  leading?: ReactNode;
  trailing?: ReactNode;
  numeric?: boolean;
};

function Field({
  label,
  hideLabel = false,
  hint,
  error,
  size = "default",
  id,
  className,
  leading,
  trailing,
  numeric,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const isInvalid = Boolean(
    error || props["aria-invalid"] === true || props["aria-invalid"] === "true",
  );
  const describedBy =
    [props["aria-describedby"], hint && hintId, error && errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={inputId}
        className={
          hideLabel
            ? "sr-only"
            : "text-xs font-semibold text-[var(--color-text)]"
        }
      >
        {label}
        {props.required ? (
          <span className="font-normal text-[var(--color-text-muted)]">
            {" "}
            (wymagane)
          </span>
        ) : null}
      </label>

      <div
        className={[
          "flex items-center gap-2 rounded-lg border bg-[var(--color-surface)] px-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-focus)]",
          size === "compact" ? "min-h-9" : "min-h-11",
          isInvalid
            ? "border-[var(--color-error-border)]"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]",
          props.disabled && "cursor-not-allowed opacity-60 bg-[var(--color-surface-raised)]",
          props.readOnly && "bg-[var(--color-surface-raised)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {leading ? (
          <span className="inline-flex shrink-0 items-center text-[var(--color-text-muted)]">
            {leading}
          </span>
        ) : null}
        <input
          {...props}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : props["aria-invalid"]}
          className={[
            "min-w-0 flex-1 bg-transparent py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:cursor-not-allowed",
            numeric && "font-mono tabular-nums",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {trailing ? (
          <span className="inline-flex shrink-0 items-center">{trailing}</span>
        ) : null}
      </div>

      {hint ? (
        <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          aria-live="polite"
          className="text-xs font-semibold text-[var(--color-error-text)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ type = "text", ...props }: TextInputProps) {
  return <Field {...props} type={type} />;
}

export type NumberInputProps = Omit<TextInputProps, "type">;

export function NumberInput(props: NumberInputProps) {
  return <Field {...props} type="number" numeric />;
}

export type SearchInputProps = Omit<
  TextInputProps,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function SearchInput({
  value,
  onValueChange,
  disabled,
  readOnly,
  ref,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Field
      {...props}
      ref={(element) => {
        inputRef.current = element;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
      }}
      type="search"
      value={value}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(event) => onValueChange(event.target.value)}
      leading={<SearchIcon size={16} />}
      trailing={
        value && !disabled && !readOnly ? (
          <button
            type="button"
            aria-label={`Wyczyść: ${props.label.toLowerCase()}`}
            onClick={() => {
              onValueChange("");
              inputRef.current?.focus();
            }}
            className="inline-flex min-h-7 min-w-7 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]"
          >
            <CloseIcon size={14} />
          </button>
        ) : undefined
      }
    />
  );
}

export type CompactSearchProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "size" | "children"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  size?: "default" | "compact";
  escapeScope?: RefObject<HTMLElement | null>;
};

/** Expandable rounded-square search control with Escape collapse and focus restoration. */
export function CompactSearch({
  label,
  value,
  onValueChange,
  size = "default",
  escapeScope,
  id,
  className,
  disabled,
  placeholder = label,
  ...props
}: CompactSearchProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [expanded, setExpanded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (expanded && !disabled) {
      input.current?.focus();
    }
  }, [expanded, disabled]);

  useEffect(() => {
    if (!expanded || disabled) return;
    function outside(event: PointerEvent) {
      if (
        !value.trim() &&
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      ) {
        setExpanded(false);
      }
    }
    function escape(event: KeyboardEvent) {
      const target = event.target;
      const scope = escapeScope?.current ?? container.current;
      if (
        event.key !== "Escape" ||
        !(target instanceof Element) ||
        !scope?.contains(target) ||
        (target.closest('[role="dialog"]') && !container.current?.contains(target))
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [expanded, disabled, value, escapeScope]);

  const isExpanded = expanded && !disabled;
  const isCompact = size === "compact";

  return (
    <div
      ref={container}
      className={[
        "inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:border-[var(--color-accent)]",
        isCompact ? "h-9" : "h-11",
        isExpanded
          ? isCompact
            ? "w-48 min-w-0 max-w-full shrink pr-1"
            : "w-64 min-w-0 max-w-full shrink pr-1"
          : isCompact
            ? "w-9 shrink-0 justify-center"
            : "w-11 shrink-0 justify-center",
        value.trim() && "border-[var(--color-accent)]",
        disabled && "opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <IconButton
        ref={trigger}
        variant="ghost"
        size="compact"
        disabled={disabled}
        aria-label={isExpanded ? "Zwiń wyszukiwarkę" : label}
        aria-expanded={isExpanded}
        aria-controls={inputId}
        onClick={() => setExpanded((prev) => !prev)}
        className={isCompact ? "min-h-[34px] min-w-[34px]" : "min-h-[42px] min-w-[42px]"}
      >
        <SearchIcon size={16} />
      </IconButton>

      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        {...props}
        ref={input}
        id={inputId}
        type="search"
        placeholder={placeholder}
        value={value}
        disabled={!isExpanded}
        aria-hidden={!isExpanded}
        onChange={(event) => onValueChange(event.target.value)}
        className={[
          "bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none",
          isExpanded ? "min-w-0 flex-1 px-1.5" : "w-0 p-0 opacity-0 pointer-events-none",
        ]
          .filter(Boolean)
          .join(" ")}
      />

      {isExpanded && value.trim() ? (
        <IconButton
          size="compact"
          variant="ghost"
          aria-label="Wyczyść wyszukiwanie"
          onClick={() => {
            onValueChange("");
            input.current?.focus();
          }}
          className={isCompact ? "min-h-[30px] min-w-[30px]" : "min-h-[34px] min-w-[34px]"}
        >
          <CloseIcon size={14} />
        </IconButton>
      ) : null}
    </div>
  );
}

export type TextAreaProps = ComponentPropsWithRef<"textarea"> & {
  label: string;
  hint?: string;
  error?: string;
  autoGrow?: boolean;
  minRows?: number;
  maxRows?: number;
  resizable?: boolean;
};

export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  rows = 4,
  autoGrow = false,
  maxRows,
  minRows = Math.min(rows, maxRows ?? rows),
  resizable = true,
  ref,
  style,
  onInput,
  ...props
}: TextAreaProps) {
  const generatedId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);

  if (
    !Number.isInteger(rows) ||
    rows < 1 ||
    !Number.isInteger(minRows) ||
    minRows < 1 ||
    (maxRows !== undefined && (!Number.isInteger(maxRows) || maxRows < minRows))
  ) {
    throw new RangeError(
      "Row limits must be positive integers, with maxRows at least minRows.",
    );
  }

  const resize = useCallback(() => {
    const element = textarea.current;
    if (!autoGrow || !element) return;
    const computed = getComputedStyle(element);
    const lineHeight =
      parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.5;
    const padding =
      parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
    const border =
      parseFloat(computed.borderTopWidth) +
      parseFloat(computed.borderBottomWidth);
    const minimum =
      parseFloat(computed.minHeight) || minRows * lineHeight + padding + border;
    const maximum = parseFloat(computed.maxHeight) || Infinity;
    const scrollTop = element.scrollTop;
    element.style.height = "0px";
    element.style.height = `${Math.min(
      maximum,
      Math.max(minimum, element.scrollHeight + border),
    )}px`;
    element.style.overflowY =
      element.scrollHeight > element.clientHeight + 1 ? "auto" : "hidden";
    element.scrollTop = scrollTop;
  }, [autoGrow, minRows]);

  useLayoutEffect(() => {
    resize();
  }, [resize, maxRows, props.value, props.defaultValue]);

  useLayoutEffect(() => {
    const element = textarea.current;
    if (!autoGrow || !element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) {
        width = element.clientWidth;
        resize();
      }
    });
    observer.observe(element);
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) resize();
    });
    return () => {
      active = false;
      observer.disconnect();
      element.style.height = "";
      element.style.overflowY = "";
    };
  }, [autoGrow, resize]);

  const inputId = id ?? generatedId;
  const isInvalid = Boolean(
    error || props["aria-invalid"] === true || props["aria-invalid"] === "true",
  );
  const describedBy =
    [props["aria-describedby"], hint && `${inputId}-hint`, error && `${inputId}-error`]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-[var(--color-text)]"
      >
        {label}
        {props.required ? (
          <span className="font-normal text-[var(--color-text-muted)]">
            {" "}
            (wymagane)
          </span>
        ) : null}
      </label>

      <div
        className={[
          "rounded-lg border bg-[var(--color-surface)] p-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-focus)]",
          isInvalid
            ? "border-[var(--color-error-border)]"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]",
          props.disabled && "cursor-not-allowed opacity-60 bg-[var(--color-surface-raised)]",
          props.readOnly && "bg-[var(--color-surface-raised)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <textarea
          {...props}
          ref={(element) => {
            textarea.current = element;
            if (typeof ref === "function") return ref(element);
            if (ref) ref.current = element;
          }}
          id={inputId}
          rows={Math.max(minRows, Math.min(rows, maxRows ?? Infinity))}
          style={{
            ...style,
            minHeight: `${minRows * 1.5}rem`,
            maxHeight:
              maxRows === undefined ? style?.maxHeight : `${maxRows * 1.5}rem`,
            resize: resizable ? "vertical" : "none",
          }}
          onInput={(event) => {
            resize();
            onInput?.(event);
          }}
          aria-describedby={describedBy}
          aria-invalid={error ? true : props["aria-invalid"]}
          className="w-full bg-transparent text-sm leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

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
