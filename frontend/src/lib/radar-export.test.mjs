import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const src = fileURLToPath(new URL("../", import.meta.url));
for (const extension of [".ts", ".tsx"]) {
  Module._extensions[extension] = (mod, filename) =>
    mod._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
      filename,
    );
}

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(src, request.slice(2)) : request,
    ...args,
  );
};

const { buildCsvContent, formatInnovationsCatalogCsv } = require("./radar-export.ts");

test("buildCsvContent prepends UTF-8 BOM and escapes commas and quotes", () => {
  const csv = buildCsvContent([
    ["Nazwa", "Opis"],
    ['e-Urząd "Seniora"', "Gmina, seniorzy i usługi"],
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"e-Urząd ""Seniora"""'));
  assert.ok(csv.includes('"Gmina, seniorzy i usługi"'));
});

test("formatInnovationsCatalogCsv emits Polish headers and rows", () => {
  const rows = formatInnovationsCatalogCsv([
    {
      id: 1,
      slug: "demo",
      title_pl: "Demo Innowacja",
      title_en: "Demo",
      short_summary_pl: "Opis",
      short_summary_en: "Desc",
      problem_pl: "Problem",
      problem_en: "Problem",
      primary_area: "technological",
      innovation_character: ["product"],
      sectors: ["ICT"],
      beneficiary_groups: ["seniors_60_plus"],
      target_org_types: ["public_institution"],
      tags: [],
      organization_name: "Uczelnia",
      organization_type: "university",
      origin_location: "Rzeszów",
      deployment_level: "pilot",
      trl: 6,
      verification_status: "verified",
      last_verified_at: "2026-11-21",
      updated_at: "2026-11-21T10:00:00Z",
      scores: {},
      missing_info: [],
      suggested_next_step: "Pilotaż",
    },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0][0], "Nazwa");
  assert.equal(rows[1][3], "Technologiczny");
  assert.equal(rows[1][10], "6/9");
});
