export type CellValue = string | number | boolean | null | undefined;
export type NumberRangeFilter = { min: string; max: string };
export type Filter = string | string[] | NumberRangeFilter;
export type ColumnType = "number" | "text" | "checkbox";

export type TableState = {
  search: string;
  filters: Record<string, Filter>;
  sort: { id: string; desc: boolean } | null;
  hidden: string[];
  pageSize: number;
  page: number;
};

export type ModelColumn<T> = {
  id: string;
  value?: (row: T) => CellValue;
  searchable?: boolean;
  searchText?: (row: T) => string;
  sortable?: boolean;
  filter?: "text" | "category" | "number";
  filterScale?: number;
  type?: ColumnType;
  width?: number | string;
  minWidth?: number | string;
};

export const defaultTableState: TableState = {
  search: "",
  filters: {},
  sort: null,
  hidden: [],
  pageSize: 10,
  page: 0,
};

/** Disabled query features cannot affect rows, even through controlled or initial state. */
export function applyTableFeatures(
  state: TableState,
  {
    search = true,
    filters = true,
    sorting = true,
  }: { search?: boolean; filters?: boolean; sorting?: boolean },
): TableState {
  return {
    ...state,
    search: search ? state.search : "",
    filters: filters ? state.filters : {},
    sort: sorting ? state.sort : null,
  };
}

export function columnType<T>(column: ModelColumn<T>): ColumnType {
  return column.type ?? (column.filter === "number" ? "number" : "text");
}

const isMissing = (value: CellValue) =>
  value == null || (typeof value === "number" && !Number.isFinite(value));

export function filterActive(filter: Filter | undefined): boolean {
  if (typeof filter === "string") return filter.trim().length > 0;
  if (Array.isArray(filter)) return filter.length > 0;
  return Boolean(filter && (filter.min !== "" || filter.max !== ""));
}

export function tableModel<T>(
  rows: readonly T[],
  columns: readonly ModelColumn<T>[],
  state: TableState,
  locale = "pl-PL",
) {
  const lower = (value: CellValue) => String(value ?? "").toLocaleLowerCase(locale);
  const query = state.search.trim().toLocaleLowerCase(locale);

  const matched = rows.filter((row) => {
    const matchesSearch =
      !query ||
      columns.some((column) => {
        if (!column.searchable) return false;
        const text = column.searchText
          ? column.searchText(row)
          : column.value
            ? column.value(row)
            : "";
        return lower(text).includes(query);
      });

    if (!matchesSearch) return false;

    return columns.every((column) => {
      const filter = state.filters[column.id];
      if (!filterActive(filter)) return true;
      const value = column.value?.(row);
      if (isMissing(value)) return false;
      if (typeof filter === "string") {
        return lower(value).includes(filter.trim().toLocaleLowerCase(locale));
      }
      if (Array.isArray(filter)) {
        return filter.includes(String(value));
      }
      const numeric = Number(value) / (column.filterScale ?? 1);
      if (!Number.isFinite(numeric)) return false;
      const hasMin = filter.min.trim() !== "";
      const hasMax = filter.max.trim() !== "";
      const min = hasMin ? Number(filter.min) : -Infinity;
      const max = hasMax ? Number(filter.max) : Infinity;
      if ((hasMin && !Number.isFinite(min)) || (hasMax && !Number.isFinite(max))) {
        return true;
      }
      return numeric >= min && numeric <= max;
    });
  });

  const sortColumn = columns.find(
    (column) => column.id === state.sort?.id && column.sortable && column.value,
  );
  const collator = new Intl.Collator(locale, { numeric: true });
  const sorted = sortColumn
    ? matched
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
          const av = sortColumn.value!(a.row);
          const bv = sortColumn.value!(b.row);
          if (isMissing(av) || isMissing(bv)) {
            if (isMissing(av) === isMissing(bv)) return a.index - b.index;
            return isMissing(av) ? 1 : -1;
          }
          const result =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : collator.compare(String(av), String(bv));
          return (state.sort?.desc ? -result : result) || a.index - b.index;
        })
        .map((item) => item.row)
    : matched;

  const pageSize = Math.max(1, state.pageSize);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(0, state.page), pages - 1);

  return {
    matched,
    pages,
    page,
    rows: sorted.slice(page * pageSize, (page + 1) * pageSize),
  };
}

/** Validate external/initial table state against current columns. */
export function normalizeTableState<T>(
  input: unknown,
  columns: readonly ModelColumn<T>[],
  required: readonly string[] = [],
): TableState {
  const s =
    input && typeof input === "object" ? (input as Partial<TableState>) : {};
  const filters: Record<string, Filter> = {};
  for (const column of columns) {
    const f =
      s.filters && typeof s.filters === "object"
        ? s.filters[column.id]
        : undefined;
    if (column.filter === "text" && typeof f === "string") {
      filters[column.id] = f;
    } else if (
      column.filter === "category" &&
      Array.isArray(f) &&
      f.every((v) => typeof v === "string")
    ) {
      filters[column.id] = f;
    } else if (
      column.filter === "number" &&
      f &&
      typeof f === "object" &&
      !Array.isArray(f) &&
      typeof f.min === "string" &&
      typeof f.max === "string"
    ) {
      const validNum = (v: string) => !v || Number.isFinite(Number(v));
      if (
        validNum(f.min) &&
        validNum(f.max) &&
        (!f.min || !f.max || Number(f.min) <= Number(f.max))
      ) {
        filters[column.id] = { min: f.min, max: f.max };
      }
    }
  }

  const hidden = Array.isArray(s.hidden)
    ? columns
        .filter((c) => s.hidden?.includes(c.id) && !required.includes(c.id))
        .map((c) => c.id)
    : [];
  if (hidden.length === columns.length && columns.length > 0) {
    hidden.shift();
  }

  return {
    ...defaultTableState,
    search: typeof s.search === "string" ? s.search : "",
    filters,
    sort:
      s.sort &&
      columns.some((c) => c.id === s.sort?.id && c.sortable) &&
      typeof s.sort.desc === "boolean"
        ? { id: s.sort.id, desc: s.sort.desc }
        : null,
    hidden,
    pageSize: [10, 25, 50, 100].includes(s.pageSize ?? 0) ? s.pageSize! : 10,
    page: 0,
  };
}
