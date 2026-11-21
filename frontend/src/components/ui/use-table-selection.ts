"use client";

import { useEffect, useRef, useState } from "react";
import {
  changeRowSelection,
  normalizeRowSelection,
  rowSelectionModel,
  sameRowSelection,
} from "./row-selection";

export function useTableSelection<T>({
  rows,
  pageRows,
  scope,
  getRowId,
  canSelectRow,
  selectedRowIds,
  onSelectionChange,
  enabled,
  interactive,
}: {
  rows: readonly T[];
  pageRows: readonly T[];
  scope: string;
  getRowId: (row: T) => string;
  canSelectRow?: (row: T) => boolean;
  selectedRowIds?: readonly string[];
  onSelectionChange?: (selectedRowIds: string[]) => void;
  enabled: boolean;
  interactive: boolean;
}) {
  const controlled = selectedRowIds !== undefined;
  const [internal, setInternal] = useState<{
    rows: readonly T[];
    scope: string;
    ids: string[];
  }>({
    rows,
    scope,
    ids: [],
  });

  const isSameScope = internal.rows === rows && internal.scope === scope;
  const activeIds = selectedRowIds ?? (isSameScope ? internal.ids : []);

  const model = rowSelectionModel({
    rows,
    pageRows,
    getRowId,
    canSelectRow,
    enabled,
    selectedRowIds: activeIds,
  });

  const reported = useRef<string[]>([]);
  useEffect(() => {
    const changed = !sameRowSelection(reported.current, model.selection);
    reported.current = model.selection;
    if (!controlled && changed) {
      onSelectionChange?.([...model.selection]);
    }
  }, [model.selection, controlled, onSelectionChange]);

  function setSelection(ids: readonly string[]) {
    const next = normalizeRowSelection(ids, model.eligibleRowIds);
    if (sameRowSelection(next, model.selection)) return;
    if (!controlled) {
      setInternal({ rows, scope, ids: next });
    }
    reported.current = next;
    onSelectionChange?.([...next]);
  }

  function toggleRow(row: T) {
    const id = getRowId(row);
    if (!interactive || !model.eligibleRowIds.has(id)) return;
    setSelection(
      changeRowSelection(
        model.selection,
        [id],
        !model.selection.includes(id),
      ),
    );
  }

  function setPageSelection(checked: boolean) {
    if (!interactive || !model.pageRowIds.length) return;
    setSelection(changeRowSelection(model.selection, model.pageRowIds, checked));
  }

  return { ...model, setSelection, toggleRow, setPageSelection };
}
