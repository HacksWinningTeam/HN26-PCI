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

const {
  computePlanProgress,
  extractOrganizationContextItems,
  formatPlanDate,
  parseUsersCountInput,
  resolvePlanVariantPreview,
} = require("./implementation-plan.ts");

function makeStep(phaseNumber, status) {
  return {
    id: phaseNumber,
    phase_number: phaseNumber,
    phase_key: `phase_${phaseNumber}`,
    title: `Faza ${phaseNumber}`,
    actions: ["Działanie"],
    deliverable: "Rezultat",
    status,
    notes: "",
    updated_at: "2026-11-22T01:00:00Z",
  };
}

test("computePlanProgress prioritizes active in_progress phase as nextStep", () => {
  const summary = computePlanProgress([
    makeStep(1, "completed"),
    makeStep(2, "not_started"),
    makeStep(3, "in_progress"),
    makeStep(4, "not_started"),
    makeStep(5, "not_started"),
  ]);

  assert.equal(summary.total, 5);
  assert.equal(summary.completed, 1);
  assert.equal(summary.inProgress, 1);
  assert.equal(summary.notStarted, 3);
  assert.equal(summary.percent, 20);
  assert.equal(summary.allCompleted, false);
  assert.equal(summary.nextStep?.phase_number, 3);
});

test("computePlanProgress reports full completion cleanly", () => {
  const summary = computePlanProgress([
    makeStep(1, "completed"),
    makeStep(2, "completed"),
  ]);

  assert.equal(summary.percent, 100);
  assert.equal(summary.allCompleted, true);
  assert.equal(summary.nextStep, null);
});

test("extractOrganizationContextItems formats known org types and skips empty fields", () => {
  const items = extractOrganizationContextItems({
    organization_name: "Gmina Trzebownisko",
    organization_type: "public_institution",
    role_title: "   ",
    deployment_location: "Podkarpackie",
    potential_users_count: 250,
    target_timeline: "Q1 2027",
    key_constraints: "",
  });

  assert.deepEqual(
    items.map((i) => [i.id, i.value]),
    [
      ["organization_name", "Gmina Trzebownisko"],
      ["organization_type", "Gmina lub instytucja publiczna"],
      ["deployment_location", "Podkarpackie"],
      ["potential_users_count", "250 osób"],
      ["target_timeline", "Q1 2027"],
    ],
  );
});

test("formatPlanDate handles valid and invalid timestamps safely", () => {
  assert.equal(formatPlanDate(undefined), "—");
  assert.equal(formatPlanDate("invalid-date"), "invalid-date");
  const formatted = formatPlanDate("2026-11-22T01:15:00Z");
  assert.ok(formatted.includes("2026"));
});

test("resolvePlanVariantPreview matches backend maturity variant rules", () => {
  assert.equal(resolvePlanVariantPreview("concept", 2).variant, "validation");
  assert.equal(resolvePlanVariantPreview("prototype", 3).variant, "validation");
  assert.equal(resolvePlanVariantPreview("prototype", 4).variant, "pilot");
  assert.equal(resolvePlanVariantPreview("tests", 6).variant, "pilot");
  assert.equal(resolvePlanVariantPreview("pilot", 7).variant, "transfer_deployment");
  assert.equal(resolvePlanVariantPreview("deployed", 9).variant, "transfer_deployment");
});

test("parseUsersCountInput validates positive integers without silent clamping", () => {
  assert.equal(parseUsersCountInput("250"), 250);
  assert.equal(parseUsersCountInput(" 1 "), 1);
  assert.equal(parseUsersCountInput(""), null);
  assert.equal(parseUsersCountInput("0"), null);
  assert.equal(parseUsersCountInput("-5"), null);
  assert.equal(parseUsersCountInput("12.5"), null);
  assert.equal(parseUsersCountInput("abc"), null);
});
