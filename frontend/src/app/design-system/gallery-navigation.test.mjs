import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  filterGallerySections,
  gallerySectionForHash,
  gallerySections,
  revealGalleryTarget,
} from "./gallery-navigation.ts";

test("gallery navigation covers every existing and planned section exactly once", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const existing = [...source.matchAll(/<DesignSection id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  const plannedStart = source.indexOf("const futureSections");
  const plannedEnd = source.indexOf("function DesignSection");
  const plannedSource = source.slice(plannedStart, plannedEnd);
  const planned = [...plannedSource.matchAll(/id: "([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(
    gallerySections
      .map((section) => section.id)
      .filter((id) => id !== "overview")
      .sort(),
    [...existing, ...planned].sort(),
  );
  assert.equal(
    new Set(gallerySections.map((section) => section.id)).size,
    gallerySections.length,
  );
});

test("sidebar search matches labels, groups and keywords without changing the full catalog", () => {
  assert.deepEqual(filterGallerySections("  "), gallerySections);
  assert.deepEqual(
    filterGallerySections("CONTRAST").map((section) => section.id),
    ["colors"],
  );
  assert.deepEqual(
    filterGallerySections("navigation radar").map((section) => section.id),
    ["navigation-bars"],
  );
  assert.ok(
    filterGallerySections("feedback").some(
      (section) => section.id === "badges-status",
    ),
  );
  assert.deepEqual(filterGallerySections("not-a-real-component"), []);
  assert.equal(gallerySectionForHash("#semantic-colors")?.id, "colors");
  assert.equal(gallerySectionForHash("#breadcrumbs")?.id, "navigation-bars");
  assert.equal(gallerySectionForHash("")?.id, "overview");
  assert.equal(gallerySectionForHash("#%invalid"), undefined);
  assert.equal(gallerySectionForHash("#main-content"), undefined);
});

test("section reveal opens disclosures before scrolling target into view", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const scrolledTargets = [];
  const outer = { open: false, parentElement: null };
  const inner = { open: false, parentElement: { closest: () => outer } };
  const target = {
    closest: () => inner,
    scrollIntoView: (options) => {
      assert.equal(inner.open, true);
      assert.equal(outer.open, true);
      scrolledTargets.push(options);
    },
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById: (id) => (id === "colors" ? target : null),
    },
  });

  try {
    revealGalleryTarget("#colors");
    assert.deepEqual(scrolledTargets, [{ behavior: "instant", block: "start" }]);
    revealGalleryTarget("#unknown");
    assert.equal(scrolledTargets.length, 1);
  } finally {
    if (original) {
      Object.defineProperty(globalThis, "document", original);
    } else {
      delete globalThis.document;
    }
  }
});
