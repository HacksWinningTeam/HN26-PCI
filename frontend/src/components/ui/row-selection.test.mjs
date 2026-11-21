import test from "node:test";
import assert from "node:assert/strict";
import {
  changeRowSelection,
  normalizeRowSelection,
  rowSelectionModel,
  selectionMenuPosition,
} from "./row-selection.ts";

const rows = [
  { id: "r1", verified: true },
  { id: "r2", verified: false },
  { id: "r3", verified: false },
  { id: "r4", verified: true },
];

test("rowSelectionModel filters out ineligible and missing IDs and computes mixed header state", () => {
  const model = rowSelectionModel({
    rows,
    pageRows: rows.slice(0, 2),
    selectedRowIds: ["r2", "r4", "missing", "r1", "r2"],
    getRowId: (r) => r.id,
    canSelectRow: (r) => !r.verified,
  });

  assert.deepEqual(model.selection, ["r2"]);
  assert.deepEqual([...model.eligibleRowIds], ["r2", "r3"]);
  assert.deepEqual(model.pageRowIds, ["r2"]);
  assert.equal(model.allPageSelected, true);
  assert.equal(model.somePageSelected, false);
  assert.deepEqual(
    model.selectedRows.map((r) => r.id),
    ["r2"],
  );
});

test("changeRowSelection updates only current page targets without dropping other pages", () => {
  const next = changeRowSelection(["r3"], ["r2"], true);
  assert.deepEqual(next, ["r3", "r2"]);

  const removed = changeRowSelection(next, ["r2"], false);
  assert.deepEqual(removed, ["r3"]);

  assert.deepEqual(
    normalizeRowSelection(["r1", "r1", "r2"], new Set(["r1", "r2"])),
    ["r1", "r2"],
  );
});

test("selectionMenuPosition clamps to viewport and hides when table is offscreen", () => {
  assert.deepEqual(
    selectionMenuPosition(
      { left: 24, right: 600, top: 120, bottom: 400, width: 576 },
      { width: 220, height: 46 },
      { width: 1024, height: 768 },
    ),
    { left: 24, top: 62 },
  );

  assert.equal(
    selectionMenuPosition(
      { left: 24, right: 600, top: 800, bottom: 900, width: 576 },
      { width: 220, height: 46 },
      { width: 1024, height: 768 },
    ),
    null,
  );
});
