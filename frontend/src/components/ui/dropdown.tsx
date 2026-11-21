"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { SearchInput } from "./input";
import { Checkbox } from "./selection";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
};

function filterOptions(options: readonly DropdownOption[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...options];
  return options.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalized),
  );
}

function useDropdownPopup(
  visible: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  anchor?: RefObject<HTMLElement | null>,
) {
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || !trigger.current || !popup.current) return;
    function position() {
      if (!trigger.current || !popup.current) return;
      const rect = (anchor?.current ?? trigger.current).getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const available = Math.max(120, Math.max(below, above));
      popup.current.style.width = `${Math.min(
        Math.max(rect.width, 220),
        window.innerWidth - 16,
      )}px`;
      popup.current.style.maxHeight = `${Math.min(320, available)}px`;
      const { width: popupWidth, height } = popup.current.getBoundingClientRect();
      popup.current.style.left = `${Math.max(
        8,
        Math.min(rect.left, window.innerWidth - popupWidth - 8),
      )}px`;
      popup.current.style.top = `${Math.max(
        8,
        below >= height || below >= above ? rect.bottom + 6 : rect.top - height - 6,
      )}px`;
      popup.current.style.visibility = "visible";
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    const observer = new ResizeObserver(position);
    observer.observe(anchor?.current ?? trigger.current);
    observer.observe(popup.current);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      observer.disconnect();
    };
  }, [visible, anchor]);

  useEffect(() => {
    if (!visible) return;
    function outside(event: Event) {
      const target = event.target as Node;
      if (
        !trigger.current?.contains(target) &&
        !anchor?.current?.contains(target) &&
        !popup.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [visible, setOpen, anchor]);

  return { trigger, popup };
}

export type DropdownProps = {
  id?: string;
  name?: string;
  label: string;
  options: readonly DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  size?: "default" | "compact";
  hideLabel?: boolean;
  searchable?: boolean;
  className?: string;
};

/** Accessible custom select/combobox with portal placement, optional search, and keyboard nav. */
export function Dropdown({
  id,
  name,
  label,
  options,
  value,
  onValueChange,
  placeholder = "Wybierz opcję",
  hint,
  error,
  disabled = false,
  size = "default",
  searchable = false,
  hideLabel = false,
  className,
}: DropdownProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listId = `${fieldId}-list`;
  const popupId = `${fieldId}-popup`;
  const searchInput = useRef<HTMLInputElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  const visible = open && !disabled;
  const selected = options.find((option) => option.value === value);
  const filtered = searchable ? filterOptions(options, query) : options;
  const enabled = filtered.filter((option) => !option.disabled);
  const activeOption =
    enabled.find((option) => option.value === active) ??
    enabled.find((option) => option.value === value) ??
    enabled[0];
  const activeIndex = filtered.findIndex((option) => option === activeOption);
  const description =
    [hint && `${fieldId}-hint`, error && `${fieldId}-error`]
      .filter(Boolean)
      .join(" ") || undefined;

  const { trigger, popup } = useDropdownPopup(visible, setOpen);

  useLayoutEffect(() => {
    if (visible && searchable) {
      searchInput.current?.focus();
    }
  }, [visible, searchable]);

  useLayoutEffect(() => {
    if (visible && activeIndex >= 0) {
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [visible, activeIndex, listId, query]);

  function show(last = false) {
    setPortalHost(
      trigger.current?.closest<HTMLElement>("dialog[open]") ?? document.body,
    );
    setQuery("");
    const enabledOpts = options.filter((option) => !option.disabled);
    setActive(
      enabledOpts.find((option) => option.value === value)?.value ??
        (last
          ? enabledOpts[enabledOpts.length - 1]?.value
          : enabledOpts[0]?.value) ??
        null,
    );
    search.current = { text: "", time: 0 };
    setOpen(true);
  }

  function choose(option: DropdownOption) {
    if (option.disabled || disabled) return;
    onValueChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(
    event: KeyboardEvent<HTMLButtonElement | HTMLInputElement>,
    fromSearch = false,
  ) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Tab") {
      if (!fromSearch) setOpen(false);
      return;
    }
    if (event.key === "Escape" && visible) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (event.key === "Enter" || (!fromSearch && event.key === " ")) {
      event.preventDefault();
      if (!visible) show();
      else if (activeOption) choose(activeOption);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!visible) {
        show(event.key === "ArrowUp");
        return;
      }
      const current = enabled.indexOf(activeOption);
      const next = Math.max(
        0,
        Math.min(
          enabled.length - 1,
          current + (event.key === "ArrowDown" ? 1 : -1),
        ),
      );
      setActive(enabled[next]?.value ?? null);
      return;
    }
    if (fromSearch) return;
    if (visible && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(
        (event.key === "Home" ? enabled[0] : enabled[enabled.length - 1])
          ?.value ?? null,
      );
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (searchable) {
        setQuery(event.key);
        setActive(null);
        show();
        return;
      }
      const key = event.key.toLocaleLowerCase();
      const previous =
        visible && event.timeStamp - search.current.time < 600
          ? search.current.text
          : "";
      const text = previous === key ? key : previous + key;
      search.current = { text, time: event.timeStamp };
      const current = enabled.indexOf(activeOption);
      const start = visible ? current + (text.length === 1 ? 1 : 0) : 0;
      const match = enabled
        .map(
          (_, offset) =>
            enabled[(Math.max(0, start) + offset) % enabled.length],
        )
        .find((option) => option.label.toLocaleLowerCase().startsWith(text));
      setActive(match?.value ?? activeOption?.value ?? null);
      if (!visible) show();
    }
  }

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={fieldId}
        id={`${fieldId}-label`}
        className={
          hideLabel
            ? "sr-only"
            : "text-xs font-semibold text-[var(--color-text)]"
        }
      >
        {label}
      </label>
      {name ? (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      ) : null}

      <button
        ref={trigger}
        id={fieldId}
        type="button"
        role="combobox"
        aria-haspopup={searchable ? "dialog" : "listbox"}
        aria-expanded={visible}
        aria-controls={visible ? (searchable ? popupId : listId) : undefined}
        aria-activedescendant={
          !searchable && visible && activeIndex >= 0
            ? `${listId}-${activeIndex}`
            : undefined
        }
        aria-labelledby={`${fieldId}-label`}
        aria-describedby={description}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onKeyDown={(event) => onKeyDown(event)}
        onClick={() => {
          if (visible) setOpen(false);
          else show();
        }}
        className={[
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-[var(--color-surface)] px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[var(--color-surface-raised)]",
          size === "compact" ? "min-h-9 py-1 text-xs" : "min-h-11 py-2",
          error
            ? "border-[var(--color-error-border)]"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected?.icon ? (
            <span className="inline-flex shrink-0" aria-hidden="true">
              {selected.icon}
            </span>
          ) : null}
          <span
            className={[
              "truncate",
              selected
                ? "text-[var(--color-text)]"
                : "text-[var(--color-text-muted)]",
            ].join(" ")}
          >
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDownIcon
          size={16}
          className="shrink-0 text-[var(--color-text-muted)]"
        />
      </button>

      {hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${fieldId}-error`}
          aria-live="polite"
          className="text-xs font-semibold text-[var(--color-error-text)]"
        >
          {error}
        </p>
      ) : null}

      {visible && portalHost
        ? createPortal(
            <div
              ref={popup}
              id={popupId}
              data-ui-dropdown-popup="true"
              role={searchable ? "dialog" : undefined}
              aria-labelledby={searchable ? `${fieldId}-label` : undefined}
              style={{ visibility: "hidden" }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Tab" || event.key === "Escape") {
                  const inSearch = event.target === searchInput.current;
                  if (
                    event.key === "Tab" &&
                    searchable &&
                    ((inSearch && !event.shiftKey && query) ||
                      (!inSearch && event.shiftKey))
                  ) {
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                  setOpen(false);
                  trigger.current?.focus();
                }
              }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none"
            >
              {searchable ? (
                <div className="border-b border-[var(--color-border-subtle)] p-2">
                  <SearchInput
                    ref={searchInput}
                    label={`Szukaj: ${label.toLocaleLowerCase()}`}
                    hideLabel
                    placeholder="Szukaj opcji…"
                    size="compact"
                    value={query}
                    onValueChange={(next) => {
                      setQuery(next);
                      setActive(null);
                    }}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-expanded={true}
                    aria-controls={listId}
                    aria-activedescendant={
                      activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
                    }
                    onKeyDown={(event) => onKeyDown(event, true)}
                  />
                </div>
              ) : null}

              <div className="overflow-y-auto p-1">
                <div id={listId} role="listbox" aria-labelledby={`${fieldId}-label`}>
                  {filtered.map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = option === activeOption;
                    return (
                      <button
                        key={option.value}
                        id={`${listId}-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={option.disabled}
                        tabIndex={-1}
                        onPointerMove={(event) => {
                          if (event.pointerType === "mouse" && !option.disabled) {
                            setActive(option.value);
                          }
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(option)}
                        className={[
                          "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                          isActive
                            ? "bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                            : "text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]",
                          isSelected && "font-semibold",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {option.icon ? (
                            <span className="inline-flex shrink-0" aria-hidden="true">
                              {option.icon}
                            </span>
                          ) : null}
                          <span className="truncate">{option.label}</span>
                        </span>
                        {isSelected ? (
                          <CheckIcon
                            size={15}
                            className="shrink-0 text-[var(--color-accent)]"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {filtered.length === 0 ? (
                  <p
                    className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]"
                    role="status"
                  >
                    {options.length === 0
                      ? "Brak dostępnych opcji."
                      : "Brak pasujących opcji."}
                  </p>
                ) : null}
              </div>
            </div>,
            portalHost,
          )
        : null}
    </div>
  );
}

export type MultiSelectProps = Omit<DropdownProps, "value" | "onValueChange"> & {
  value: string[];
  onValueChange: (value: string[]) => void;
};

/** Multi-select dropdown with checkboxes, optional search, selection count, and Clear all. */
export function MultiSelect({
  id,
  name,
  label,
  options,
  value,
  onValueChange,
  placeholder = "Wybierz opcje",
  hint,
  error,
  disabled = false,
  size = "default",
  searchable = false,
  hideLabel = false,
  className,
}: MultiSelectProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  const visible = open && !disabled;
  const filtered = searchable ? filterOptions(options, query) : options;
  const selected = options.filter((option) => value.includes(option.value));
  const selectedLabels = selected.map((option) => option.label).join(", ");
  const canClear = selected.some((option) => !option.disabled);
  const { trigger, popup } = useDropdownPopup(visible, setOpen);

  useLayoutEffect(() => {
    if (visible) {
      (
        searchInput.current ??
        popup.current?.querySelector<HTMLInputElement>("input:not(:disabled)") ??
        popup.current
      )?.focus();
    }
  }, [visible, popup]);

  function openPopup() {
    setPortalHost(
      trigger.current?.closest<HTMLElement>("dialog[open]") ?? document.body,
    );
    setQuery("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label
        htmlFor={fieldId}
        id={`${fieldId}-label`}
        className={
          hideLabel
            ? "sr-only"
            : "text-xs font-semibold text-[var(--color-text)]"
        }
      >
        {label}
      </label>
      {name
        ? value.map((item) => (
            <input
              key={item}
              type="hidden"
              name={name}
              value={item}
              disabled={disabled}
            />
          ))
        : null}

      <button
        ref={trigger}
        id={fieldId}
        type="button"
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={visible}
        aria-controls={visible ? `${fieldId}-popup` : undefined}
        aria-labelledby={`${fieldId}-label ${fieldId}-value`}
        aria-describedby={
          [hint && `${fieldId}-hint`, error && `${fieldId}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => {
          if (visible) setOpen(false);
          else openPopup();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openPopup();
          }
        }}
        className={[
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-[var(--color-surface)] px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[var(--color-surface-raised)]",
          size === "compact" ? "min-h-9 py-1 text-xs" : "min-h-11 py-2",
          error
            ? "border-[var(--color-error-border)]"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          id={`${fieldId}-value`}
          className={[
            "min-w-0 flex-1 truncate",
            selected.length > 0
              ? "text-[var(--color-text)]"
              : "text-[var(--color-text-muted)]",
          ].join(" ")}
        >
          {selectedLabels || placeholder}
        </span>
        <ChevronDownIcon
          size={16}
          className="shrink-0 text-[var(--color-text-muted)]"
        />
      </button>

      {hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${fieldId}-error`}
          aria-live="polite"
          className="text-xs font-semibold text-[var(--color-error-text)]"
        >
          {error}
        </p>
      ) : null}

      {visible && portalHost
        ? createPortal(
            <div
              ref={popup}
              id={`${fieldId}-popup`}
              data-ui-dropdown-popup="true"
              role="dialog"
              aria-labelledby={`${fieldId}-label`}
              tabIndex={-1}
              style={{ visibility: "hidden" }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  close();
                }
                if (event.key === "Tab") {
                  const targets = Array.from(
                    popup.current?.querySelectorAll<HTMLElement>(
                      "input:not(:disabled),button:not(:disabled)",
                    ) ?? [],
                  );
                  if (
                    (event.shiftKey && event.target === targets[0]) ||
                    (!event.shiftKey &&
                      event.target === targets[targets.length - 1]) ||
                    targets.length === 0
                  ) {
                    close();
                  }
                }
              }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none"
            >
              {searchable ? (
                <div className="border-b border-[var(--color-border-subtle)] p-2">
                  <SearchInput
                    ref={searchInput}
                    label={`Szukaj: ${label.toLocaleLowerCase()}`}
                    hideLabel
                    placeholder="Szukaj opcji…"
                    size="compact"
                    value={query}
                    onValueChange={setQuery}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        popup.current
                          ?.querySelector<HTMLInputElement>(
                            'input[type="checkbox"]:not(:disabled)',
                          )
                          ?.focus();
                      }
                    }}
                  />
                </div>
              ) : null}

              <div
                className="overflow-y-auto p-1"
                role="group"
                aria-label={label}
              >
                {filtered.map((option) => {
                  const checked = value.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={option.disabled}
                        onChange={() =>
                          onValueChange(
                            checked
                              ? value.filter((item) => item !== option.value)
                              : [...value, option.value],
                          )
                        }
                      />
                      <span className="truncate">{option.label}</span>
                    </label>
                  );
                })}
                {filtered.length === 0 ? (
                  <p
                    className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]"
                    role="status"
                  >
                    {options.length > 0
                      ? "Brak pasujących opcji."
                      : "Brak dostępnych opcji."}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs">
                <span role="status" className="font-medium text-[var(--color-text-muted)]">
                  Wybrano: {selected.length}
                </span>
                <Button
                  variant="ghost"
                  size="compact"
                  disabled={!canClear}
                  onClick={() => {
                    onValueChange(
                      value.filter(
                        (item) =>
                          options.find((option) => option.value === item)
                            ?.disabled,
                      ),
                    );
                    (
                      searchInput.current ??
                      popup.current?.querySelector<HTMLInputElement>(
                        "input:not(:disabled)",
                      ) ??
                      popup.current
                    )?.focus();
                  }}
                >
                  Wyczyść
                </Button>
              </div>
            </div>,
            portalHost,
          )
        : null}
    </div>
  );
}
