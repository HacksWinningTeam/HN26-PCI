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
  for (const query of ["sidebar", "app shell", "floating navy"]) {
    assert.deepEqual(
      filterGallerySections(query).map((section) => section.id),
      ["navigation-bars"],
    );
  }
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

test("section reveal opens disclosures and scrolls only the content column", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const scrolledTargets = [];
  const outer = { open: false, parentElement: null };
  const inner = { open: false, parentElement: { closest: () => outer } };
  const target = {
    closest: () => inner,
    getBoundingClientRect: () => {
      assert.equal(inner.open, true);
      assert.equal(outer.open, true);
      return { top: 284 };
    },
    scrollIntoView: () => assert.fail("must not scroll ancestor containers"),
  };
  const container = {
    scrollTop: 120,
    clientTop: 0,
    contains: (element) => element === target,
    getBoundingClientRect: () => ({ top: 64 }),
    scrollTo: (options) => scrolledTargets.push(options),
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById: (id) => id === "main-content" ? container : id === "colors" ? target : null,
    },
  });

  try {
    revealGalleryTarget("#colors");
    assert.deepEqual(scrolledTargets, [{ top: 324, left: 0, behavior: "instant" }]);
    revealGalleryTarget("#unknown");
    assert.equal(scrolledTargets.length, 1);
    revealGalleryTarget("#semantic-colors");
    assert.deepEqual(scrolledTargets[1], { top: 324, left: 0, behavior: "instant" });
    revealGalleryTarget("");
    assert.deepEqual(scrolledTargets[2], { top: 0, left: 0, behavior: "instant" });
  } finally {
    if (original) {
      Object.defineProperty(globalThis, "document", original);
    } else {
      delete globalThis.document;
    }
  }
});
