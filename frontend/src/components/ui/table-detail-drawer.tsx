"use client";

import { useId, type ReactNode, type RefObject } from "react";
import { useLocale, useTranslations } from "@/i18n/provider";
import { IconButton } from "./button";
import { Drawer } from "./drawer";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export function TableDetailDrawer({
  title,
  description,
  tableName,
  position,
  total,
  children,
  onClose,
  onNavigate,
  returnFocus,
}: {
  title: string;
  description?: string;
  tableName: string;
  position: number;
  total: number;
  children: ReactNode;
  onClose: () => void;
  onNavigate: (position: number) => void;
  returnFocus: RefObject<HTMLDivElement | null>;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const descriptionId = useId();
  const numberFormat = new Intl.NumberFormat(locale);

  function restoreTableFocus() {
    const scroll = returnFocus.current;
    (
      scroll?.querySelector<HTMLElement>("[data-detail-trigger='true']") ?? scroll
    )?.focus({ preventScroll: true });
  }

  return (
    <Drawer
      open
      title={title}
      aria-describedby={description ? descriptionId : undefined}
      closeLabel={t("Close details")}
      contentKey={position}
      returnFocus={restoreTableFocus}
      onClose={onClose}
      headerAccessory={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            className="m-0 text-xs text-[var(--color-text-muted)]"
          >
            {tableName ? `${tableName} · ` : ""}
            {t("Record {0} of {1} on this page", {
              0: numberFormat.format(position + 1),
              1: numberFormat.format(total),
            })}
          </p>
          <div className="flex gap-1.5">
            <IconButton
              size="compact"
              variant="ghost"
              aria-label={t("Previous record")}
              disabled={position === 0}
              onClick={() => onNavigate(position - 1)}
            >
              <ChevronLeftIcon size={16} />
            </IconButton>
            <IconButton
              size="compact"
              variant="ghost"
              aria-label={t("Next record")}
              disabled={position + 1 >= total}
              onClick={() => onNavigate(position + 1)}
            >
              <ChevronRightIcon size={16} />
            </IconButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {description ? (
          <p
            id={descriptionId}
            className="m-0 text-sm leading-relaxed text-[var(--color-text-muted)]"
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </Drawer>
  );
}
