"use client";

import { useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "@/i18n/provider";
import { Button, IconButton } from "./button";
import { Dropdown } from "./dropdown";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DrawerIcon,
  FilterIcon,
  SlidersIcon,
  SortArrowsIcon,
  SpinnerIcon,
} from "./icons";
import { CompactSearch, NumberInput, TextInput } from "./input";
import { DefinitionList } from "./list";
import { Popover } from "./popover";
import { Checkbox, CheckboxGroup, SegmentedControl } from "./selection";
import { TableDetailDrawer } from "./table-detail-drawer";
import {
  applyTableFeatures,
  columnType,
  defaultTableState,
  filterActive,
  normalizeTableState,
  tableModel,
  type Filter,
  type ModelColumn,
  type TableState,
} from "./table-model";
import {
  TableSelectionMenu,
  type TableSelectionAction,
} from "./table-selection-menu";
import { useTableSelection } from "./use-table-selection";
import styles from "./table.module.css";

export { SimpleTable, type SimpleTableColumn, type SimpleTableProps } from "./simple-table";
export {
  defaultTableState,
  normalizeTableState,
  tableModel,
  type CellValue,
  type ColumnType,
  type Filter,
  type NumberRangeFilter,
  type TableState,
} from "./table-model";
export type { TableSelectionAction } from "./table-selection-menu";

export type TableColumn<T> = ModelColumn<T> & {
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  options?: readonly { value: string; label: string }[];
};

export type DataTableRowDetails<T> = {
  title: (row: T) => string;
  description?: (row: T) => string;
  render?: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  id?: string;
  name: string;
  rows: readonly T[];
  columns: readonly TableColumn<T>[];
  getRowId: (row: T) => string;
  accent?: "cyan" | "lime";
  pagination?: boolean;
  headerRow?: boolean;
  pinnedHeader?: boolean;
  headerColumn?: boolean;
  headerSortButtons?: boolean;
  sorting?: boolean;
  filters?: boolean;
  search?: boolean;
  toolbar?: boolean;
  toolbarActions?: ReactNode;
  emptyState?: ReactNode;
  noResultsState?:
    | ReactNode
    | ((context: { clearFilters: () => void }) => ReactNode);
  height?: number | string;
  pinnedColumn?: string;
  selectable?: boolean;
  selectedRowIds?: readonly string[];
  onSelectionChange?: (selectedRowIds: string[]) => void;
  canSelectRow?: (row: T) => boolean;
  selectionActions?: readonly TableSelectionAction<T>[];
  rowActions?: (row: T) => ReactNode;
  rowDetails?: DataTableRowDetails<T>;
  state?: TableState;
  onStateChange?: (state: TableState) => void;
  initialState?: Partial<TableState>;
  status?: "ready" | "loading" | "refreshing" | "error";
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
};

function TablePopover({
  label,
  icon,
  children,
  active = false,
  triggerLabel,
  triggerAriaLabel,
  width = 320,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  active?: boolean;
  width?: number;
  triggerLabel?: string;
  triggerAriaLabel?: string;
}) {
  return (
    <Popover
      title={label}
      width={width}
      closeButton
      trigger={(props) => (
        <IconButton
          {...props}
          size="compact"
          variant="outline"
          aria-label={triggerAriaLabel ?? triggerLabel ?? label}
          visibleLabel={triggerLabel}
          data-active={active || props["aria-expanded"] ? "true" : undefined}
          className={styles.tool}
        >
          {icon}
        </IconButton>
      )}
    >
      {children}
    </Popover>
  );
}

function PageJump({
  page,
  pages,
  disabled,
  onJump,
}: {
  page: number;
  pages: number;
  disabled: boolean;
  onJump: (page: number) => void;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const numberFormat = new Intl.NumberFormat(locale);
  const [draft, setDraft] = useState(String(page + 1));

  const parsed = Number(draft);
  const valid =
    draft.trim() !== "" &&
    Number.isSafeInteger(parsed) &&
    parsed >= 1 &&
    parsed <= pages;

  return (
    <form
      className={styles.pageJumpForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onJump(parsed - 1);
      }}
    >
      <TextInput
        className={styles.pageJump}
        label={t("Jump to page")}
        hideLabel
        size="compact"
        type="number"
        inputMode="numeric"
        min={1}
        max={pages}
        step={1}
        required
        disabled={disabled}
        value={draft}
        aria-invalid={(draft !== "" && !valid) || undefined}
        title={t("Enter a page from 1 to {0}", {
          0: numberFormat.format(pages),
        })}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={() => setDraft(String(page + 1))}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(String(page + 1));
          }
        }}
      />
    </form>
  );
}

/** Focused, accessible DataTable with search, sorting, column filters, pagination, row selection, and detail drawer. */
export function DataTable<T>({
  name,
  rows,
  columns,
  getRowId,
  accent = "cyan",
  pagination = true,
  headerRow = true,
  pinnedHeader = true,
  headerColumn = true,
  headerSortButtons = true,
  sorting = true,
  filters: filtering = true,
  search: searching = true,
  toolbar = true,
  toolbarActions,
  emptyState,
  noResultsState,
  height,
  pinnedColumn,
  selectable = false,
  selectedRowIds,
  onSelectionChange,
  canSelectRow,
  selectionActions,
  rowActions,
  rowDetails,
  state: controlled,
  onStateChange,
  initialState,
  status = "ready",
  errorMessage,
  onRetry,
  className,
}: DataTableProps<T>) {
  const locale = useLocale();
  const t = useTranslations();
  const numberFormat = new Intl.NumberFormat(locale);

  const required = [pinnedColumn ?? columns[0]?.id].filter(Boolean) as string[];
  const [internal, setInternal] = useState<TableState>(() =>
    normalizeTableState({ ...defaultTableState, ...initialState }, columns, required),
  );
  const sourceState = controlled ?? internal;
  const state = applyTableFeatures(sourceState, {
    search: searching,
    filters: filtering,
    sorting,
  });

  const scope = JSON.stringify([state.search, state.filters, !!selectable]);
  const searchScope = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<{
    id: string;
    context: string;
    source: readonly T[];
  } | null>(null);

  const model = tableModel(
    rows,
    columns,
    pagination
      ? state
      : { ...state, page: 0, pageSize: Math.max(1, rows.length) },
    locale,
  );

  const {
    selection,
    selectedRows,
    eligibleRowIds,
    pageRowIds,
    allPageSelected,
    somePageSelected,
    setSelection,
    toggleRow,
    setPageSelection,
  } = useTableSelection({
    rows,
    pageRows: model.rows,
    scope,
    getRowId,
    canSelectRow,
    selectedRowIds,
    onSelectionChange,
    enabled: selectable,
    interactive: status === "ready",
  });

  const visible = columns.filter((column) => !state.hidden.includes(column.id));
  const ordered = pinnedColumn
    ? [
        ...visible.filter((column) => column.id === pinnedColumn),
        ...visible.filter((column) => column.id !== pinnedColumn),
      ]
    : visible;

  const hasActions = Boolean(rowActions);
  const span = ordered.length + Number(selectable) + Number(hasActions);

  const sortableColumns = columns.filter((column) => column.sortable && column.value);
  const filterableColumns = columns.filter((column) => column.filter && column.value);
  const hasSearchable = columns.some((column) => column.searchable);

  const activeFilters = columns.filter((column) =>
    filterActive(state.filters[column.id]),
  );
  const sortedColumn = columns.find(
    (column) => column.id === state.sort?.id && column.sortable,
  );
  const busy = status === "loading" || status === "refreshing";

  const cellContext = JSON.stringify([
    scope,
    state.sort,
    model.page,
    state.pageSize,
    ordered.map((column) => column.id),
    model.rows.map(getRowId),
  ]);

  const activeDetail =
    detail &&
    detail.source === rows &&
    detail.context === cellContext &&
    status === "ready" &&
    rowDetails
      ? detail
      : null;

  const detailIndex = activeDetail
    ? model.rows.findIndex((row) => getRowId(row) === activeDetail.id)
    : -1;
  const detailRow = detailIndex >= 0 ? model.rows[detailIndex] : undefined;

  function update(patch: Partial<TableState>, resetPage = true) {
    const next = { ...sourceState, ...patch, ...(resetPage ? { page: 0 } : {}) };
    if (!controlled) setInternal(next);
    onStateChange?.(next);
  }

  function setFilter(columnId: string, value: Filter) {
    update({ filters: { ...state.filters, [columnId]: value } });
  }

  function clearFilters() {
    update({ search: "", filters: {} });
  }

  function openDetails(row: T) {
    if (status === "ready" && rowDetails) {
      setDetail({ id: getRowId(row), context: cellContext, source: rows });
    }
  }

  function renderCell(column: TableColumn<T>, row: T): ReactNode {
    if (column.render) return column.render(row);
    const value = column.value?.(row);
    if (columnType(column) === "checkbox" && typeof value === "boolean") {
      return (
        <Checkbox
          checked={value}
          disabled
          aria-label={`${column.label}: ${getRowId(row)}`}
        />
      );
    }
    if (value == null) return t("Value unavailable");
    if (typeof value === "number") return numberFormat.format(value);
    return String(value);
  }

  function renderBodyCell(column: TableColumn<T>, row: T, index: number): ReactNode {
    const value = renderCell(column, row);
    if (index !== 0 || !rowDetails) return value;
    return (
      <div className={styles.identityCell}>
        <div className={styles.identityValue}>{value}</div>
        <IconButton
          data-detail-trigger="true"
          className={styles.detailButton}
          size="compact"
          variant="ghost"
          disabled={status !== "ready"}
          aria-label={t("View details")}
          onClick={() => openDetails(row)}
        >
          <DrawerIcon size={16} />
        </IconButton>
      </div>
    );
  }

  function columnClassName(column: TableColumn<T>) {
    return [
      column.id === pinnedColumn ? styles.pinned : "",
      columnType(column) === "checkbox"
        ? styles.checkboxCell
        : column.align === "right"
          ? styles.numeric
          : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function renderEmptyState() {
    if (!rows.length) {
      return emptyState === undefined ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("No records yet")}
        </p>
      ) : (
        emptyState
      );
    }
    if (noResultsState !== undefined) {
      return typeof noResultsState === "function"
        ? noResultsState({ clearFilters })
        : noResultsState;
    }
    return (
      <>
        <p className="text-sm text-[var(--color-text-muted)]">
          {t("No matching results")}
        </p>
        <Button variant="outline" size="compact" onClick={clearFilters}>
          {t("Clear filters")}
        </Button>
      </>
    );
  }

  function pageButton(page: number) {
    return (
      <Button
        key={page}
        size="compact"
        variant="ghost"
        className={styles.pageButton}
        aria-label={t("Page {0}", { 0: numberFormat.format(page + 1) })}
        aria-current={page === model.page ? "page" : undefined}
        disabled={status !== "ready"}
        onClick={() => update({ page }, false)}
      >
        {numberFormat.format(page + 1)}
      </Button>
    );
  }

  const hasToolbarActions =
    toolbarActions != null && typeof toolbarActions !== "boolean";

  return (
    <div
      data-accent={accent}
      className={[styles.root, className].filter(Boolean).join(" ")}
    >
      <header ref={searchScope} className={styles.header}>
        <div className={styles.headingRow}>
          <h3 className={styles.title}>{name}</h3>
          {(toolbar || hasToolbarActions) && (
            <div className={styles.headerActions}>
              {toolbar ? (
                <div className={styles.tools}>
                  {sorting && sortableColumns.length > 0 ? (
                    <TablePopover
                      label={t("Sort")}
                      width={300}
                      triggerLabel={sortedColumn?.label}
                      triggerAriaLabel={
                        sortedColumn
                          ? t("Sort by {0}: {1}", {
                              0: sortedColumn.label,
                              1: t(state.sort?.desc ? "Descending" : "Ascending"),
                            })
                          : undefined
                      }
                      icon={
                        sortedColumn ? (
                          state.sort?.desc ? (
                            <ArrowDownIcon size={16} />
                          ) : (
                            <ArrowUpIcon size={16} />
                          )
                        ) : (
                          <SortArrowsIcon size={16} />
                        )
                      }
                      active={Boolean(sortedColumn)}
                    >
                      <div className="space-y-5">
                        <Dropdown
                          label={t("Sort by")}
                          size="compact"
                          value={state.sort?.id ?? ""}
                          onValueChange={(value) =>
                            update({
                              sort: value
                                ? {
                                    id: value,
                                    desc: state.sort?.desc ?? false,
                                  }
                                : null,
                            })
                          }
                          options={[
                            { value: "", label: t("Original order") },
                            ...sortableColumns.map((column) => ({
                              value: column.id,
                              label: column.label,
                            })),
                          ]}
                        />

                        {state.sort ? (
                          <SegmentedControl
                            label={t("Direction")}
                            accent={accent}
                            value={state.sort.desc ? "desc" : "asc"}
                            onValueChange={(value) =>
                              update({
                                sort: {
                                  id: state.sort!.id,
                                  desc: value === "desc",
                                },
                              })
                            }
                            options={[
                              {
                                value: "asc",
                                label: t("Ascending"),
                                icon: <ArrowUpIcon size={14} />,
                              },
                              {
                                value: "desc",
                                label: t("Descending"),
                                icon: <ArrowDownIcon size={14} />,
                              },
                            ]}
                          />
                        ) : null}

                        {state.sort ? (
                          <div className="flex justify-end pt-1">
                            <Button
                              variant="ghost"
                              size="compact"
                              onClick={() => update({ sort: null })}
                            >
                              {t("Clear sort")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </TablePopover>
                  ) : null}

                  {filtering && filterableColumns.length > 0 ? (
                    <TablePopover
                      label={t("Filters")}
                      triggerLabel={
                        activeFilters.length === 1
                          ? t("1 filter")
                          : activeFilters.length > 1
                            ? t("{0} filters", {
                                0: numberFormat.format(activeFilters.length),
                              })
                            : undefined
                      }
                      icon={<FilterIcon size={16} />}
                      active={activeFilters.length > 0}
                      width={360}
                    >
                      <div className="space-y-5">
                        {filterableColumns.map((column) => {
                          const f = state.filters[column.id];
                          if (column.filter === "category") {
                            const selected = Array.isArray(f) ? f : [];
                            return (
                              <CheckboxGroup
                                key={column.id}
                                label={column.label}
                                layout="pills"
                                accent={accent}
                                value={selected}
                                onValueChange={(next) =>
                                  setFilter(column.id, next)
                                }
                                options={(column.options ?? []).map(
                                  (option) => ({
                                    value: option.value,
                                    label: option.label,
                                  }),
                                )}
                              />
                            );
                          }

                          if (column.filter === "text") {
                            return (
                              <TextInput
                                key={column.id}
                                label={column.label}
                                size="compact"
                                placeholder="…"
                                value={typeof f === "string" ? f : ""}
                                onChange={(event) =>
                                  setFilter(column.id, event.target.value)
                                }
                              />
                            );
                          }

                          const range =
                            f && typeof f === "object" && !Array.isArray(f)
                              ? f
                              : { min: "", max: "" };
                          return (
                            <fieldset
                              key={column.id}
                              className="m-0 space-y-2 border-0 p-0"
                            >
                              <legend className="text-xs font-semibold text-[var(--color-text)]">
                                {column.label}
                              </legend>
                              <div className="grid grid-cols-2 gap-3">
                                {(["min", "max"] as const).map((bound) => (
                                  <NumberInput
                                    key={bound}
                                    label={t(bound === "min" ? "From" : "To")}
                                    size="compact"
                                    step="any"
                                    placeholder="—"
                                    value={range[bound]}
                                    min={bound === "max" ? range.min : undefined}
                                    max={bound === "min" ? range.max : undefined}
                                    onChange={(event) =>
                                      setFilter(column.id, {
                                        ...range,
                                        [bound]: event.target.value,
                                      })
                                    }
                                  />
                                ))}
                              </div>
                            </fieldset>
                          );
                        })}

                        <div className="space-y-2 pt-1">
                          <p className="m-0 text-xs leading-relaxed text-[var(--color-text-muted)]">
                            {t(
                              "All filters must match. Selected categories match any selected value.",
                            )}
                          </p>
                          {activeFilters.length > 0 ? (
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="compact"
                                onClick={() => update({ filters: {} })}
                              >
                                {t("Clear filters")}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TablePopover>
                  ) : null}

                  {searching && hasSearchable ? (
                    <CompactSearch
                      label={t("Search table")}
                      size="compact"
                      value={state.search}
                      onValueChange={(search) => update({ search })}
                      escapeScope={searchScope}
                    />
                  ) : null}

                  <TablePopover
                    label={t("Table options")}
                    width={300}
                    icon={<SlidersIcon size={16} />}
                  >
                    <div className="space-y-5">
                      {pagination ? (
                        <SegmentedControl
                          label={t("Rows per page")}
                          accent={accent}
                          value={String(state.pageSize)}
                          onValueChange={(value) =>
                            update({ pageSize: Number(value) })
                          }
                          options={[10, 25, 50, 100].map((size) => ({
                            value: String(size),
                            label: String(size),
                          }))}
                        />
                      ) : null}

                      <fieldset className="m-0 border-0 p-0">
                        <legend className="mb-2 text-xs font-semibold text-[var(--color-text)]">
                          {t("Visible columns")}
                        </legend>
                        <div className="space-y-1.5">
                          {columns.map((column) => {
                            const locked = required.includes(column.id);
                            const checked = !state.hidden.includes(column.id);
                            return (
                              <label
                                key={column.id}
                                className={[
                                  "flex min-h-8 items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-text)] transition-colors",
                                  locked
                                    ? "cursor-not-allowed opacity-60"
                                    : "cursor-pointer hover:bg-[var(--color-surface-raised)]",
                                ].join(" ")}
                              >
                                <span className="flex min-w-0 items-center gap-2.5">
                                  <Checkbox
                                    checked={checked}
                                    disabled={locked}
                                    onChange={(event) =>
                                      update(
                                        {
                                          hidden: event.target.checked
                                            ? state.hidden.filter(
                                                (v) => v !== column.id,
                                              )
                                            : [...state.hidden, column.id],
                                        },
                                        false,
                                      )
                                    }
                                  />
                                  <span className="truncate">{column.label}</span>
                                </span>
                                {locked ? (
                                  <span className="shrink-0 text-[11px] font-normal text-[var(--color-text-muted)]">
                                    {t("Fixed")}
                                  </span>
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="compact"
                          variant="ghost"
                          onClick={() => {
                            update(
                              normalizeTableState(
                                { ...defaultTableState, ...initialState },
                                columns,
                                required,
                              ),
                            );
                            setSelection([]);
                          }}
                        >
                          {t("Reset table")}
                        </Button>
                      </div>
                    </div>
                  </TablePopover>
                </div>
              ) : null}

              {hasToolbarActions ? (
                <div className={styles.callerActions}>{toolbarActions}</div>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <p role="status" className="sr-only">
        {status === "ready"
          ? `${t("Matching rows")}: ${numberFormat.format(model.matched.length)} / ${numberFormat.format(rows.length)}`
          : busy
            ? t("Loading table…")
            : t("Table could not be loaded.")}
      </p>

      <div
        ref={scrollRef}
        className={styles.scroll}
        style={height !== undefined ? { maxHeight: height } : undefined}
        tabIndex={0}
        role="region"
        aria-label={name}
        aria-busy={busy}
      >
        {status === "loading" || status === "error" ? (
          <div className={styles.message} role={status === "error" ? "alert" : "status"}>
            {status === "loading" ? (
              <>
                <SpinnerIcon size={16} />
                <span>{t("Loading table…")}</span>
              </>
            ) : (
              <>
                <p className="m-0 text-sm text-[var(--color-error-text)]">
                  {errorMessage ?? t("Table could not be loaded.")}
                </p>
                {onRetry ? (
                  <Button size="compact" variant="outline" onClick={onRetry}>
                    {t("Try again")}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <>
            {status === "refreshing" ? (
              <p
                role="status"
                className="m-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-info-bg)] px-3 py-2 text-xs font-medium text-[var(--color-info-text)]"
              >
                {t("Refreshing; showing previous data.")}
              </p>
            ) : null}

            <table
              className={styles.table}
              data-selectable={selectable || undefined}
            >
              <caption className="sr-only">{name}</caption>
              <thead
                data-hidden={!headerRow || undefined}
                data-pinned={headerRow && pinnedHeader}
                className={!headerRow ? "sr-only" : undefined}
              >
                <tr>
                  {selectable ? (
                    <th
                      scope="col"
                      className={styles.selection}
                      data-selection-column="true"
                    >
                      {headerRow ? (
                        <Checkbox
                          aria-label={t(
                            canSelectRow
                              ? pagination
                                ? "Select all selectable rows on this page"
                                : "Select all selectable matching rows"
                              : pagination
                                ? "Select all rows on this page"
                                : "Select all matching rows",
                          )}
                          disabled={!pageRowIds.length || busy}
                          checked={allPageSelected}
                          indeterminate={somePageSelected}
                          onChange={(event) =>
                            setPageSelection(event.target.checked)
                          }
                        />
                      ) : (
                        t("Select row")
                      )}
                    </th>
                  ) : null}

                  {ordered.map((column) => {
                    const isSorted = state.sort?.id === column.id;
                    const defaultMinWidth =
                      columnType(column) === "checkbox" ||
                      column.align === "right"
                        ? 110
                        : 180;
                    return (
                      <th
                        key={column.id}
                        scope="col"
                        style={{
                          width: column.width,
                          minWidth: column.minWidth ?? defaultMinWidth,
                        }}
                        className={columnClassName(column)}
                        aria-sort={
                          sorting && column.sortable
                            ? isSorted
                              ? state.sort?.desc
                                ? "descending"
                                : "ascending"
                              : "none"
                            : undefined
                        }
                      >
                        {headerRow ? (
                          <div className={styles.headerCell}>
                            <span className={styles.headerLabel}>
                              {column.label}
                            </span>
                            {sorting && headerSortButtons && column.sortable ? (
                              <IconButton
                                className={styles.sortButton}
                                size="compact"
                                variant="ghost"
                                data-active={isSorted ? "true" : undefined}
                                aria-label={t("Sort by {0}", {
                                  0: column.label,
                                })}
                                onClick={() =>
                                  update({
                                    sort:
                                      state.sort?.id !== column.id
                                        ? { id: column.id, desc: false }
                                        : !state.sort.desc
                                          ? { id: column.id, desc: true }
                                          : null,
                                  })
                                }
                              >
                                {isSorted ? (
                                  state.sort?.desc ? (
                                    <ArrowDownIcon size={14} />
                                  ) : (
                                    <ArrowUpIcon size={14} />
                                  )
                                ) : (
                                  <SortArrowsIcon size={14} />
                                )}
                              </IconButton>
                            ) : null}
                          </div>
                        ) : (
                          column.label
                        )}
                      </th>
                    );
                  })}

                  {hasActions ? <th scope="col">{t("Actions")}</th> : null}
                </tr>
              </thead>

              <tbody>
                {model.rows.map((row) => {
                  const rowId = getRowId(row);
                  const selected = selection.includes(rowId);
                  return (
                    <tr
                      key={rowId}
                      data-selected={selected ? "true" : undefined}
                    >
                      {selectable ? (
                        <td
                          className={styles.selection}
                          data-selection-column="true"
                        >
                          <Checkbox
                            disabled={busy || !eligibleRowIds.has(rowId)}
                            aria-label={`${t("Select row")}: ${rowId}`}
                            checked={selected}
                            onChange={() => toggleRow(row)}
                          />
                        </td>
                      ) : null}

                      {ordered.map((column, index) => {
                        const Tag = headerColumn && index === 0 ? "th" : "td";
                        return (
                          <Tag
                            key={column.id}
                            scope={
                              headerColumn && index === 0 ? "row" : undefined
                            }
                            data-pinned={
                              column.id === pinnedColumn ? "true" : undefined
                            }
                            className={[
                              columnClassName(column),
                              headerColumn && index === 0
                                ? "font-semibold"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onDoubleClick={(event) => {
                              const target = event.target;
                              if (
                                target instanceof Element &&
                                target.closest(
                                  "a,button,input,select,textarea,label,[role='button']",
                                )
                              ) {
                                return;
                              }
                              openDetails(row);
                            }}
                          >
                            {renderBodyCell(column, row, index)}
                          </Tag>
                        );
                      })}

                      {hasActions ? (
                        <td>
                          <div className={styles.rowActions}>
                            {busy ? null : rowActions?.(row)}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}

                {model.rows.length === 0 ? (
                  <tr>
                    <td colSpan={span} className={styles.emptyCell}>
                      <div className={styles.emptyState}>
                        {renderEmptyState()}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </>
        )}
      </div>

      {pagination && status !== "loading" && status !== "error" ? (
        <nav className={styles.pagination} aria-label={t("Pagination")}>
          <IconButton
            size="compact"
            variant="ghost"
            aria-label={t("Previous")}
            disabled={model.page === 0 || status !== "ready"}
            onClick={() => update({ page: model.page - 1 }, false)}
          >
            <ChevronLeftIcon size={16} />
          </IconButton>

          {model.pages > 5 ? (
            <>
              {model.page > 1 ? pageButton(0) : null}
              {model.page > 2 ? (
                <span className={styles.pageGap} aria-hidden="true">
                  …
                </span>
              ) : null}
              {model.page > 0 ? pageButton(model.page - 1) : null}
              <PageJump
                key={`${model.page}-${model.pages}`}
                page={model.page}
                pages={model.pages}
                disabled={status !== "ready"}
                onJump={(page) => update({ page }, false)}
              />
              {model.page + 1 < model.pages
                ? pageButton(model.page + 1)
                : null}
              {model.page + 1 < model.pages - 2 ? (
                <span className={styles.pageGap} aria-hidden="true">
                  …
                </span>
              ) : null}
              {model.page + 1 < model.pages - 1
                ? pageButton(model.pages - 1)
                : null}
            </>
          ) : (
            Array.from({ length: model.pages }, (_, page) => pageButton(page))
          )}

          <IconButton
            size="compact"
            variant="ghost"
            aria-label={t("Next")}
            disabled={model.page + 1 >= model.pages || status !== "ready"}
            onClick={() => update({ page: model.page + 1 }, false)}
          >
            <ChevronRightIcon size={16} />
          </IconButton>
        </nav>
      ) : null}

      {selectable && selectedRows.length > 0 && status === "ready" ? (
        <TableSelectionMenu
          rows={selectedRows}
          actions={selectionActions}
          anchor={scrollRef}
          onClear={() => setSelection([])}
        />
      ) : null}

      {detailRow !== undefined && rowDetails && status === "ready" ? (
        <TableDetailDrawer
          title={rowDetails.title(detailRow)}
          description={rowDetails.description?.(detailRow)}
          tableName={name}
          position={detailIndex}
          total={model.rows.length}
          returnFocus={scrollRef}
          onClose={() => setDetail(null)}
          onNavigate={(index) => openDetails(model.rows[index])}
        >
          <DefinitionList
            items={columns.map((column) => ({
              id: column.id,
              label: column.label,
              value: renderCell(column, detailRow),
            }))}
          />
          {rowDetails.render?.(detailRow)}
        </TableDetailDrawer>
      ) : null}
    </div>
  );
}
