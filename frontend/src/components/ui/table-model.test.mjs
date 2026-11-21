import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTableFeatures,
  defaultTableState as base,
  normalizeTableState,
  tableModel,
} from "./table-model.ts";
import { placeOverlay } from "./overlay-placement.ts";

const columns = [
  { id: "title", value: (r) => r.title, sortable: true, searchable: true, filter: "text" },
  { id: "trl", value: (r) => r.trl, sortable: true, filter: "number" },
  { id: "area", value: (r) => r.area, filter: "category", searchable: true },
];

const rows = [
  { title: "Beta", trl: 7, area: "tech" },
  { title: "Alfa", trl: 7, area: "edu" },
  { title: "Gamma", trl: null, area: "tech" },
  { title: "Delta", trl: 4, area: "admin" },
];

test("disabled query features ignore controlled or initial queries without mutating state", () => {
  const state = {
    ...base,
    search: "tech",
    filters: { trl: { min: "5", max: "" } },
    sort: { id: "title", desc: true },
  };
  const original = structuredClone(state);

  for (const search of [false, true]) {
    for (const filters of [false, true]) {
      for (const sorting of [false, true]) {
        const model = tableModel(
          rows,
          columns,
          applyTableFeatures(state, { search, filters, sorting }),
        );
        const expected = (search ? rows.filter((r) => r.area === "tech") : rows).filter(
          (r) => !filters || (r.trl !== null && r.trl >= 5),
        );
        if (sorting) expected.sort((a, b) => b.title.localeCompare(a.title));
        assert.deepEqual(model.rows, expected);
      }
    }
  }
  assert.deepEqual(state, original);
});

test("sorting is stable and null values stay last in both directions", () => {
  for (const desc of [false, true]) {
    const model = tableModel(rows, columns, {
      ...base,
      sort: { id: "trl", desc },
    });
    assert.equal(model.rows.at(-1).title, "Gamma");
    assert.ok(
      model.rows.findIndex((r) => r.title === "Beta") <
        model.rows.findIndex((r) => r.title === "Alfa"),
    );
  }
});

test("search includes hidden columns and combines with AND across filters and OR inside categories", () => {
  const model = tableModel(rows, columns, {
    ...base,
    search: "TECH",
    hidden: ["area"],
    filters: {
      area: ["tech", "edu"],
      trl: { min: "5", max: "9" },
    },
  });
  assert.deepEqual(
    model.rows.map((r) => r.title),
    ["Beta"],
  );
});

test("pagination clamps out-of-range pages cleanly", () => {
  const model = tableModel(rows, columns, { ...base, pageSize: 2, page: 99 });
  assert.equal(model.pages, 2);
  assert.equal(model.page, 1);
  assert.deepEqual(
    model.rows.map((r) => r.title),
    ["Gamma", "Delta"],
  );
});

test("normalizeTableState validates filters, strips unknown columns, and protects required identity column", () => {
  const restored = normalizeTableState(
    {
      search: "edu",
      page: 4,
      pageSize: 0,
      hidden: ["title", "missing", "area"],
      sort: { id: "missing", desc: true },
      filters: {
        missing: "bad",
        trl: { min: "x", max: "5" },
        area: ["edu"],
      },
    },
    columns,
    ["title"],
  );
  assert.equal(restored.page, 0);
  assert.equal(restored.pageSize, 10);
  assert.deepEqual(restored.hidden, ["area"]);
  assert.equal(restored.sort, null);
  assert.deepEqual(restored.filters, { area: ["edu"] });
  assert.deepEqual(normalizeTableState(null, columns), base);
});

test("placeOverlay keeps floating popovers inside the visual viewport", () => {
  const below = placeOverlay(
    { left: 20, top: 40, right: 80, bottom: 76, width: 60 },
    { width: 300, height: 180 },
    { left: 0, top: 0, width: 400, height: 600 },
  );
  assert.equal(below.left, 20);
  assert.equal(below.top, 84);

  const flipped = placeOverlay(
    { left: 200, top: 520, right: 260, bottom: 556, width: 60 },
    { width: 300, height: 180 },
    { left: 0, top: 0, width: 400, height: 600 },
  );
  assert.equal(flipped.left, 92);
  assert.equal(flipped.top, 332);
});
