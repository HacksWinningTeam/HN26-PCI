"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
} from "react";
import { IconButton } from "./button";
import { ChevronRightIcon, DotsIcon } from "./icons";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = Omit<ComponentPropsWithRef<"nav">, "children"> & {
  items: readonly BreadcrumbItem[];
  showCurrent?: boolean;
  size?: "default" | "compact";
};

/** Ordered navigation path that collapses parent items into a menu on narrow containers. */
export function Breadcrumbs({
  items,
  showCurrent = true,
  size = "default",
  className,
  "aria-label": label = "Ścieżka nawigacji",
  "aria-labelledby": labelledBy,
  ...props
}: BreadcrumbsProps) {
  const displayItems = showCurrent ? items : items.slice(0, -1);
  const list = useRef<HTMLOListElement>(null);
  const measurement = useRef<HTMLOListElement>(null);
  const menuContainer = useRef<HTMLLIElement>(null);
  const restoreFocus = useRef<boolean | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!list.current || !measurement.current || displayItems.length < 2) return;
    function measure() {
      if (!list.current || !measurement.current) return;
      const next =
        measurement.current.getBoundingClientRect().width >
        list.current.getBoundingClientRect().width;
      if (next !== collapsed) {
        const focused = list.current.contains(document.activeElement);
        restoreFocus.current = focused ? next : null;
        setCollapsed(next);
        if (!next) setMenuOpen(false);
      }
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list.current);
    observer.observe(measurement.current);
    return () => observer.disconnect();
  }, [displayItems, collapsed]);

  useLayoutEffect(() => {
    if (restoreFocus.current !== collapsed) return;
    restoreFocus.current = null;
    list.current
      ?.querySelector<HTMLElement>(
        collapsed ? "button" : "a[href], [aria-current]",
      )
      ?.focus();
  }, [collapsed]);

  useEffect(() => {
    if (!menuOpen) return;
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuContainer.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuContainer.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  if (displayItems.length === 0) return null;

  const separatorSize = size === "compact" ? 12 : 14;
  const separator = (
    <ChevronRightIcon
      size={separatorSize}
      className="mx-1 shrink-0 text-[var(--color-text-muted)]"
    />
  );
  const tail = displayItems[displayItems.length - 1];

  function renderTail(measuring = false) {
    if (showCurrent) {
      return (
        <span
          aria-current={measuring ? undefined : "page"}
          tabIndex={measuring ? undefined : -1}
          title={tail.label}
          className="truncate font-semibold text-[var(--color-text)]"
        >
          {tail.label}
        </span>
      );
    }
    if (!measuring && tail.href) {
      return (
        <Link
          href={tail.href}
          title={tail.label}
          className="truncate font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] hover:underline"
        >
          {tail.label}
        </Link>
      );
    }
    return (
      <span title={tail.label} className="truncate text-[var(--color-text-muted)]">
        {tail.label}
      </span>
    );
  }

  function renderPath(measuring = false) {
    return displayItems.map((item, index) => (
      <li key={index} className="inline-flex min-w-0 items-center">
        {index > 0 ? separator : null}
        {index === displayItems.length - 1 ? (
          renderTail(measuring)
        ) : !measuring && item.href ? (
          <Link
            href={item.href}
            className="whitespace-nowrap font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] hover:underline"
          >
            {item.label}
          </Link>
        ) : (
          <span className="whitespace-nowrap text-[var(--color-text-muted)]">
            {item.label}
          </span>
        )}
      </li>
    ));
  }

  return (
    <nav
      {...props}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={[
        "relative min-w-0",
        size === "compact" ? "text-xs" : "text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ol ref={list} className="flex min-w-0 items-center">
        {collapsed && displayItems.length > 1 ? (
          <>
            <li ref={menuContainer} className="relative inline-flex items-center">
              <IconButton
                size="compact"
                variant="outline"
                aria-label="Pokaż poprzednie strony"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <DotsIcon size={16} />
              </IconButton>

              {menuOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  className="absolute top-full left-0 z-30 mt-1.5 min-w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
                >
                  {displayItems.slice(0, -1).map((item, idx) =>
                    item.href ? (
                      <Link
                        key={idx}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex min-h-9 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        key={idx}
                        className="flex min-h-9 items-center px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
                      >
                        {item.label}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </li>
            <li className="inline-flex min-w-0 items-center">
              {separator}
              {renderTail()}
            </li>
          </>
        ) : (
          renderPath()
        )}
      </ol>

      {displayItems.length > 1 ? (
        <div
          aria-hidden="true"
          inert
          className="pointer-events-none invisible absolute top-0 left-0 whitespace-nowrap"
        >
          <ol ref={measurement} className="inline-flex items-center">
            {renderPath(true)}
          </ol>
        </div>
      ) : null}
    </nav>
  );
}
