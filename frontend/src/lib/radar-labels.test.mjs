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
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  EVIDENCE_KIND_LABELS,
  ORG_TYPE_LABELS,
  PLAN_VARIANT_LABELS,
  PRIMARY_AREA_LABELS,
} = require("./radar-labels.ts");

test("taxonomy labels match the 13-point domain specification", () => {
  assert.deepEqual(Object.keys(PRIMARY_AREA_LABELS), [
    "technological",
    "educational",
    "administrative",
  ]);
  assert.deepEqual(Object.keys(CHARACTER_LABELS), [
    "product",
    "process",
    "organizational",
    "social",
  ]);
  assert.equal(Object.keys(BENEFICIARY_LABELS).length, 15);
  assert.equal(Object.keys(DEPLOYMENT_LABELS).length, 5);
  assert.equal(Object.keys(ORG_TYPE_LABELS).length, 7);
  assert.equal(Object.keys(PLAN_VARIANT_LABELS).length, 3);
  assert.equal(Object.keys(EVIDENCE_KIND_LABELS).length, 5);
});
