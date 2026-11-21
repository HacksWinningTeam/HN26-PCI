"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "@/i18n/provider";
import type { ModelColumn } from "./table-model";
import styles from "./table.module.css";

export type SimpleTableColumn<T> = Pick<
  ModelColumn<T>,
  "id" | "value" | "width" | "minWidth"
> & {
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
};

export type SimpleTableProps<T> = {
  name: string;
  rows: readonly T[];
  columns: readonly SimpleTableColumn<T>[];
  getRowId: (row: T) => string;
  accent?: "cyan" | "lime";
  striping?: "none" | "rows" | "columns" | "both";
  headerRow?: boolean;
  headerColumn?: boolean;
  pinnedHeader?: boolean;
  height?: number | string;
  maxHeight?: number | string;
  emptyState?: ReactNode;
  className?: string;
};

/** Lightweight native table with striping, sticky header, and horizontal/vertical scroll region. */
export function SimpleTable<T>({
  name,
  rows,
  columns,
  getRowId,
  accent = "cyan",
  striping = "rows",
  headerRow = true,
  headerColumn = false,
  pinnedHeader = true,
  height,
  maxHeight,
  emptyState,
  className,
}: SimpleTableProps<T>) {
  const locale = useLocale();
  const t = useTranslations();
  const numberFormat = new Intl.NumberFormat(locale);
  const resolvedHeight = height ?? maxHeight;

  function renderCell(column: SimpleTableColumn<T>, row: T): ReactNode {
    if (column.render) return column.render(row);
    const raw = column.value ? column.value(row) : undefined;
    if (raw === null || raw === undefined) return t("Value unavailable");
    if (typeof raw === "number") return numberFormat.format(raw);
    return String(raw);
  }

  return (
    <div
      data-accent={accent}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      <div
        role="region"
        aria-label={name}
        tabIndex={0}
        style={
          resolvedHeight !== undefined
            ? { maxHeight: resolvedHeight }
            : undefined
        }
        className={styles.scroll}
      >
        <table
          className={`${styles.table} ${styles.simple}`}
          data-striping={striping}
        >
          <caption className="sr-only">{name}</caption>
          <thead
            data-hidden={!headerRow || undefined}
            data-pinned={headerRow && pinnedHeader}
            className={!headerRow ? "sr-only" : undefined}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  style={{
                    width: column.width,
                    minWidth:
                      column.minWidth ??
                      (column.align === "right" ? 110 : 160),
                  }}
                  className={
                    column.align === "right" ? styles.numeric : undefined
                  }
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((column, index) => {
                  const isRowHeader = headerColumn && index === 0;
                  const Cell = isRowHeader ? "th" : "td";
                  return (
                    <Cell
                      key={column.id}
                      scope={isRowHeader ? "row" : undefined}
                      className={[
                        column.align === "right" ? styles.numeric : "",
                        isRowHeader ? "font-semibold" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {renderCell(column, row)}
                    </Cell>
                  );
                })}
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    {emptyState ?? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {t("No records yet")}
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
