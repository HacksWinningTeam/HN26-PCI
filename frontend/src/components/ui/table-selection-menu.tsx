"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { useLocale, useTranslations } from "@/i18n/provider";
import { IconButton } from "./button";
import { CloseIcon } from "./icons";
import { selectionMenuPosition } from "./row-selection";
import styles from "./table.module.css";

export type TableSelectionAction<T> = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: (rows: readonly T[]) => void;
  disabled?: boolean;
  tone?: "neutral" | "lime" | "destructive";
};

export function TableSelectionMenu<T>({
  rows,
  actions = [],
  anchor,
  onClear,
}: {
  rows: readonly T[];
  actions?: readonly TableSelectionAction<T>[];
  anchor: RefObject<HTMLDivElement | null>;
  onClear: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const menu = useRef<HTMLDivElement>(null);
  const formattedCount = new Intl.NumberFormat(locale).format(rows.length);

  function restoreFocus() {
    const table = anchor.current;
    (
      table?.querySelector<HTMLElement>(
        'tbody [data-selection-column="true"] input:checked:not(:disabled)',
      ) ?? table
    )?.focus({ preventScroll: true });
  }

  function clear() {
    restoreFocus();
    onClear();
  }

  useLayoutEffect(() => {
    const element = menu.current;
    const table = anchor.current;
    if (!element || !table) return;
    element.showPopover?.();

    function position() {
      if (!element || !table) return;
      const rect = table.getBoundingClientRect();
      const { width, height } = element.getBoundingClientRect();
      const placement = selectionMenuPosition(
        rect,
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
      );
      if (placement) {
        element.style.left = `${placement.left}px`;
        element.style.top = `${placement.top}px`;
      }
      element.style.visibility = placement ? "visible" : "hidden";
    }

    position();
    const observer = new ResizeObserver(position);
    observer.observe(table);
    observer.observe(element);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);

    return () => {
      if (element.contains(document.activeElement)) {
        table.focus({ preventScroll: true });
      }
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (element.isConnected) element.hidePopover?.();
    };
  }, [anchor]);

  return (
    <div
      ref={menu}
      popover="manual"
      role="group"
      aria-label={t("Selection actions")}
      className={styles.selectionMenu}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          clear();
        }
      }}
    >
      <span role="status" className={styles.selectionCount}>
        {t("{0} selected", { 0: formattedCount })}
      </span>
      <div className={styles.selectionActions}>
        {actions.map((action) => (
          <IconButton
            key={action.id}
            size="compact"
            variant="ghost"
            shape="pill"
            aria-label={action.label}
            disabled={action.disabled}
            tone={action.tone}
            onClick={() => action.onSelect(rows)}
          >
            {action.icon}
          </IconButton>
        ))}
        <IconButton
          size="compact"
          variant="ghost"
          shape="pill"
          aria-label={t("Clear selection")}
          onClick={clear}
        >
          <CloseIcon size={16} />
        </IconButton>
      </div>
    </div>
  );
}
