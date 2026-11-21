"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { MinusIcon, PlusIcon } from "./icons";

export type StepperProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  unit?: string;
  disabled?: boolean;
  size?: "default" | "compact";
  fullWidth?: boolean;
  className?: string;
};

function stepperValue(
  value: number,
  direction: number,
  step: number,
  min: number,
  max: number,
) {
  const sum = value + direction * step;
  return Math.max(min, Math.min(max, Number(sum.toPrecision(12))));
}

function stepperDelay(elapsed: number) {
  return elapsed >= 3000 ? 30 : elapsed >= 1000 ? 60 : 120;
}

/** Accessible spinbutton stepper with hold-to-repeat acceleration and boundary validation. */
export function Stepper({
  label,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  hint,
  unit,
  disabled = false,
  size = "default",
  fullWidth = false,
  className,
}: StepperProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ text: string; base: number } | null>(null);
  const [touched, setTouched] = useState(false);
  const [held, setHeld] = useState<number | null>(null);
  const latest = useRef({ value, min, max, step, disabled, onValueChange });
  const active = useRef<{
    direction: number;
    source: "pointer" | "keyboard";
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (![value, min, max, step].every(Number.isFinite) || min > max || step <= 0) {
    throw new RangeError("Provide finite bounds and a positive step.");
  }

  const text = draft?.base === value ? draft.text : String(value);
  const parsedNum = Number(text.replace(",", ".").trim());
  const valid =
    text.trim() !== "" &&
    Number.isFinite(parsedNum) &&
    parsedNum >= min &&
    parsedNum <= max;
  const error =
    touched && !valid
      ? `Wpisz wartość od ${min} do ${max}.`
      : undefined;

  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    active.current = null;
    setHeld(null);
  }, []);

  useLayoutEffect(() => {
    latest.current = { value, min, max, step, disabled, onValueChange };
    if (
      disabled ||
      (active.current &&
        (active.current.direction < 0 ? value <= min : value >= max))
    ) {
      stop();
    }
  }, [value, min, max, step, disabled, onValueChange, stop]);

  useEffect(() => {
    const releasePointer = () => {
      if (active.current?.source === "pointer") stop();
    };
    const releaseKey = (event: globalThis.KeyboardEvent) => {
      if (
        active.current?.source === "keyboard" &&
        (event.key === " " || event.key === "Enter")
      ) {
        stop();
      }
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    window.addEventListener("keyup", releaseKey);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      active.current = null;
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      window.removeEventListener("keyup", releaseKey);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [stop]);

  function commit(next: number) {
    setDraft(null);
    setTouched(false);
    latest.current.value = next;
    if (next !== value) latest.current.onValueChange(next);
  }

  const increment = useCallback((direction: number): boolean => {
    const current = latest.current;
    if (
      current.disabled ||
      (direction < 0 ? current.value <= current.min : current.value >= current.max)
    ) {
      stop();
      return false;
    }
    const next = stepperValue(
      current.value,
      direction,
      current.step,
      current.min,
      current.max,
    );
    current.value = next;
    setDraft(null);
    setTouched(false);
    current.onValueChange(next);
    if (next <= current.min || next >= current.max) {
      stop();
      return false;
    }
    return true;
  }, [stop]);

  const start = useCallback(
    (direction: number, source: "pointer" | "keyboard") => {
      stop();
      if (!increment(direction)) return;
      active.current = { direction, source };
      setHeld(direction);
      let elapsed = 350;
      function repeat() {
        const press = active.current;
        if (!press || !increment(press.direction)) return;
        const delay = stepperDelay(elapsed);
        elapsed += delay;
        timer.current = setTimeout(repeat, delay);
      }
      timer.current = setTimeout(repeat, 350);
    },
    [increment, stop],
  );

  function pointerDown(
    event: PointerEvent<HTMLButtonElement>,
    direction: number,
  ) {
    if (event.button !== 0 || !event.isPrimary || disabled) return;
    start(direction, "pointer");
  }

  function keyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    direction: number,
  ) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!event.repeat) start(direction, "keyboard");
    }
    if (event.key === "Escape") stop();
  }

  function renderStepButton(direction: -1 | 1) {
    const isAtBound = direction < 0 ? value <= min : value >= max;
    return (
      <button
        type="button"
        disabled={disabled || isAtBound}
        aria-label={`${direction < 0 ? "Zmniejsz" : "Zwiększ"} ${label.toLowerCase()}`}
        data-held={held === direction || undefined}
        onPointerDown={(event) => pointerDown(event, direction)}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={() => {
          if (active.current?.source === "pointer") stop();
        }}
        onBlur={stop}
        onKeyDown={(event) => keyDown(event, direction)}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            stop();
          }
        }}
        onClick={(event) => {
          if (
            event.detail === 0 &&
            !(event.nativeEvent as globalThis.PointerEvent).pointerType
          ) {
            increment(direction);
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
        className={[
          "inline-flex shrink-0 cursor-pointer items-center justify-center text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40",
          size === "compact" ? "min-h-9 min-w-9" : "min-h-11 min-w-11",
          held === direction && "bg-[var(--color-surface-raised)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {direction < 0 ? <MinusIcon size={16} /> : <PlusIcon size={16} />}
      </button>
    );
  }

  return (
    <div
      className={[
        "flex flex-col gap-1.5",
        fullWidth ? "w-full" : "w-fit",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        htmlFor={id}
        className="text-xs font-semibold text-[var(--color-text)]"
      >
        {label}
      </label>

      <div
        className={[
          "inline-flex items-center overflow-hidden rounded-lg border bg-[var(--color-surface)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-focus)]",
          fullWidth ? "w-full" : "w-auto",
          error
            ? "border-[var(--color-error-border)]"
            : "border-[var(--color-border)]",
          disabled && "opacity-60 bg-[var(--color-surface-raised)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {renderStepButton(-1)}
        <div className="flex min-w-16 flex-1 items-center justify-center gap-1 border-x border-[var(--color-border-subtle)] px-2">
          <input
            ref={input}
            id={id}
            type="text"
            role="spinbutton"
            inputMode="decimal"
            value={text}
            disabled={disabled}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={valid ? parsedNum : value}
            aria-valuetext={`${valid ? parsedNum : value}${unit ? ` ${unit}` : ""}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [hint && `${id}-hint`, error && `${id}-error`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => {
              stop();
              const nextText = event.target.value;
              const num = Number(nextText.replace(",", ".").trim());
              const allowed =
                nextText.trim() !== "" &&
                Number.isFinite(num) &&
                num >= min &&
                num <= max;
              setDraft({ text: nextText, base: allowed ? num : value });
              if (allowed) {
                latest.current.value = num;
                if (num !== value) onValueChange(num);
              }
            }}
            onBlur={() => setTouched(true)}
            onKeyDown={(event) => {
              if (
                event.nativeEvent.isComposing ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey
              ) {
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                setTouched(true);
                if (valid) {
                  setDraft(null);
                  setTouched(false);
                }
              }
              if (event.key === "Escape") {
                event.preventDefault();
                stop();
                setDraft(null);
                setTouched(false);
              }
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                increment(event.key === "ArrowUp" ? 1 : -1);
              }
              if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                stop();
                commit(event.key === "Home" ? min : max);
              }
            }}
            className="w-14 flex-1 bg-transparent text-center font-mono text-sm font-semibold tabular-nums text-[var(--color-text)] focus:outline-none disabled:cursor-not-allowed"
          />
          {unit ? (
            <span
              className="text-xs font-medium text-[var(--color-text-muted)]"
              aria-hidden="true"
            >
              {unit}
            </span>
          ) : null}
        </div>
        {renderStepButton(1)}
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
    </div>
  );
}
