/** Keep stable caller IDs in their supplied order, without missing or ineligible records. */
export function normalizeRowSelection(
  ids: readonly string[],
  eligible: ReadonlySet<string>,
): string[] {
  return [...new Set(ids)].filter((id) => eligible.has(id));
}

export function sameRowSelection(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Select or deselect a page/row without changing selection on other pages. */
export function changeRowSelection(
  current: readonly string[],
  targets: readonly string[],
  checked: boolean,
): string[] {
  const ids = new Set(targets);
  return checked
    ? [...new Set([...current, ...ids])]
    : current.filter((id) => !ids.has(id));
}

export function rowSelectionModel<T>({
  rows,
  pageRows,
  selectedRowIds,
  getRowId,
  canSelectRow,
  enabled = true,
}: {
  rows: readonly T[];
  pageRows: readonly T[];
  selectedRowIds: readonly string[];
  getRowId: (row: T) => string;
  canSelectRow?: (row: T) => boolean;
  enabled?: boolean;
}) {
  const eligibleRowIds = new Set(
    enabled
      ? rows
          .filter((row) => !canSelectRow || canSelectRow(row))
          .map(getRowId)
      : [],
  );
  const selection = normalizeRowSelection(selectedRowIds, eligibleRowIds);
  const selected = new Set(selection);
  const pageRowIds = pageRows
    .map(getRowId)
    .filter((id) => eligibleRowIds.has(id));
  const allPageSelected =
    pageRowIds.length > 0 && pageRowIds.every((id) => selected.has(id));

  return {
    selection,
    eligibleRowIds,
    pageRowIds,
    allPageSelected,
    somePageSelected:
      !allPageSelected && pageRowIds.some((id) => selected.has(id)),
    selectedRows: rows.filter((row) => selected.has(getRowId(row))),
  };
}

/** Align the floating selection capsule above the table, clamped to the viewport. */
export function selectionMenuPosition(
  table: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
  },
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  if (
    table.width <= 0 ||
    table.right <= 0 ||
    table.left >= viewport.width ||
    table.bottom <= 8 ||
    table.top >= viewport.height - 8
  ) {
    return null;
  }
  const left = Math.max(
    8,
    Math.min(table.left, viewport.width - menu.width - 8),
  );
  const top = Math.max(
    8,
    Math.min(table.top - menu.height - 12, viewport.height - menu.height - 8),
  );
  return { left, top };
}
