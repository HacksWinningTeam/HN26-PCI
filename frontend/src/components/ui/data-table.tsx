"use client";

import type { ReactNode } from "react";

export type TableColumn<T> = {
  id: string;
  label: string;
  value?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: string;
};

export type SimpleTableProps<T> = {
  name: string;
  rows: readonly T[];
  columns: readonly TableColumn<T>[];
  getRowId: (row: T) => string;
  striping?: "none" | "rows";
  headerRow?: boolean;
  headerColumn?: boolean;
  pinnedHeader?: boolean;
  maxHeight?: number | string;
  emptyState?: ReactNode;
  className?: string;
};

/** Accessible data table with sticky header, row striping, horizontal scroll region, and empty state. */
export function SimpleTable<T>({
  name,
  rows,
  columns,
  getRowId,
  striping = "rows",
  headerRow = true,
  headerColumn = false,
  pinnedHeader = true,
  maxHeight,
  emptyState,
  className,
}: SimpleTableProps<T>) {
  function renderCell(column: TableColumn<T>, row: T): ReactNode {
    if (column.render) return column.render(row);
    const raw = column.value ? column.value(row) : undefined;
    if (raw === null || raw === undefined) return "—";
    return String(raw);
  }

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        role="region"
        aria-label={name}
        tabIndex={0}
        style={maxHeight !== undefined ? { maxHeight } : undefined}
        className="overflow-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-xs sm:text-sm">
          <caption className="sr-only">{name}</caption>
          <thead
            className={[
              !headerRow && "sr-only",
              headerRow && pinnedHeader && "sticky top-0 z-10",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={[
                    "p-3 font-bold text-[var(--color-text)]",
                    column.align === "right" && "text-right",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {rows.map((row, rowIndex) => (
              <tr
                key={getRowId(row)}
                className={
                  striping === "rows" && rowIndex % 2 === 1
                    ? "bg-[var(--color-surface-raised)]/40"
                    : undefined
                }
              >
                {columns.map((column, colIndex) => {
                  const isRowHeader = headerColumn && colIndex === 0;
                  const Cell = isRowHeader ? "th" : "td";
                  return (
                    <Cell
                      key={column.id}
                      scope={isRowHeader ? "row" : undefined}
                      className={[
                        "p-3 align-top text-[var(--color-text)]",
                        isRowHeader && "font-semibold",
                        column.align === "right" &&
                          "text-right font-mono tabular-nums",
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
                <td colSpan={columns.length} className="p-6 text-center">
                  {emptyState ?? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Brak rekordów do wyświetlenia.
                    </p>
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
