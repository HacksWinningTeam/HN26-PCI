import test from "node:test";
import assert from "node:assert/strict";
import { getLegacySolveRedirect, hasMatchContextChanged, selectInnovationResults } from "./innovation-search.ts";

const filters = {
  primaryArea: "", character: "", sector: "", beneficiaries: [], originLocation: "",
  deploymentLevel: "", trlMin: "", sourceOrgType: "", verifiedOnly: false,
};
const record = (slug, changes = {}) => ({
  slug, title_pl: slug, primary_area: "technological", innovation_character: ["product"],
  sectors: ["ICT"], beneficiary_groups: ["seniors_60_plus"], origin_location: "Gdynia",
  deployment_level: "pilot", trl: 6, organization_type: "company", verification_status: "verified",
  updated_at: "2026-11-21", scores: { application_potential: 70 }, ...changes,
});

test("shared constraints filter catalog and matches without confusing source and adopter", () => {
  const company = record("company");
  const school = record("school", { organization_type: "school" });
  assert.deepEqual(selectInnovationResults([company, school], { ...filters, sourceOrgType: "school" }, "name"), [school]);
  assert.deepEqual(selectInnovationResults([company], { ...filters, originLocation: " GDYNIA ", trlMin: "6", primaryArea: "technological", character: "product", sector: "ICT", verifiedOnly: true }, "name"), [company]);
  assert.equal(selectInnovationResults([company], { ...filters, primaryArea: "educational" }, "name").length, 0);
  assert.equal(selectInnovationResults([company], { ...filters, character: "social" }, "name").length, 0);
  assert.equal(selectInnovationResults([company], { ...filters, sector: "edukacja" }, "name").length, 0);
  assert.equal(selectInnovationResults([company], { ...filters, deploymentLevel: "deployed" }, "name").length, 0);
  assert.equal(selectInnovationResults([record("pending", { verification_status: "pending_review" })], { ...filters, verifiedOnly: true }, "name").length, 0);
});

test("multiple beneficiaries match any selected group, while missing TRL never passes a minimum", () => {
  const senior = record("senior");
  const children = record("children", { beneficiary_groups: ["children_0_12"], trl: null });
  const selected = { ...filters, beneficiaries: ["seniors_60_plus", "children_0_12"] };
  assert.equal(selectInnovationResults([senior, children], selected, "name").length, 2);
  assert.deepEqual(selectInnovationResults([senior, children], { ...selected, trlMin: "1" }, "name"), [senior]);
  assert.equal(selectInnovationResults([senior], { ...filters, trlMin: "7" }, "name").length, 0);
});

test("relevance preserves real match scores, other sorts work without mutating input", () => {
  const items = [record("A"), record("B", { scores: { application_potential: 90 }, deployment_level: "deployed", updated_at: "2026-11-22" })];
  const matches = { A: { overall_score: 90 }, B: { overall_score: 40 } };
  assert.deepEqual(selectInnovationResults(items, filters, "relevance", matches).map((x) => x.slug), ["A", "B"]);
  for (const sort of ["potential", "deployment_level", "updated_at"]) {
    assert.deepEqual(selectInnovationResults(items, filters, sort).map((x) => x.slug), ["B", "A"]);
  }
  assert.deepEqual(items.map((x) => x.slug), ["A", "B"]);
});

test("legacy problem links preserve query text and repeated parameters", () => {
  assert.equal(getLegacySolveRedirect({}), "/innovations?mode=problem");
  const result = new URL(getLegacySolveRedirect({ q: "pomoc seniorom", tag: ["a", "b"], mode: "catalog", absent: undefined }), "https://example.com");
  assert.equal(result.pathname, "/innovations");
  assert.equal(result.searchParams.get("q"), "pomoc seniorom");
  assert.equal(result.searchParams.get("mode"), "problem");
  assert.deepEqual(result.searchParams.getAll("tag"), ["a", "b"]);
});

const matchedContext = {
  problem_text: "Pomoc seniorom w urzędzie", sector: "ICT", beneficiary_groups: ["seniors_60_plus", "children_0_12"],
  organization_type: "local_government", deployment_location: "Rzeszów", problem_scale: "1500 osób", preferred_maturity: "pilot",
};

test("clearing shared match filters and removing one beneficiary require recalculation", () => {
  assert.equal(hasMatchContextChanged(matchedContext, { ...matchedContext, sector: "", beneficiary_groups: [] }), true);
  assert.equal(hasMatchContextChanged(matchedContext, { ...matchedContext, beneficiary_groups: ["children_0_12"] }), true);
  assert.equal(hasMatchContextChanged(matchedContext, { ...matchedContext }), false);
});

test("reselecting the same beneficiary groups in a different order keeps match scores current", () => {
  const previousOrder = [...matchedContext.beneficiary_groups];
  const current = { ...matchedContext, beneficiary_groups: [...previousOrder].reverse() };
  assert.equal(hasMatchContextChanged(matchedContext, current), false);
  assert.deepEqual(matchedContext.beneficiary_groups, previousOrder);
  assert.deepEqual(current.beneficiary_groups, [...previousOrder].reverse());
});

test("every edited problem or adopter field invalidates the previous matching context", () => {
  for (const field of ["problem_text", "sector", "organization_type", "deployment_location", "problem_scale", "preferred_maturity"]) {
    assert.equal(hasMatchContextChanged(matchedContext, { ...matchedContext, [field]: "" }), true, field);
  }
});
