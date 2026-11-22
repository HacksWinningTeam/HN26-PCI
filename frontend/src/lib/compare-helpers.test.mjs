import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSlotOptions,
  computeKeyDifferences,
  computeScoreRanges,
  updateCompareSlot,
} from "./compare-helpers.ts";

const sampleSummary = (slug, title, org) => ({
  id: 1,
  slug,
  title_pl: title,
  title_en: title,
  short_summary_pl: "Opis",
  short_summary_en: "Summary",
  problem_pl: "Problem",
  problem_en: "Problem",
  primary_area: "technological",
  innovation_character: ["product"],
  sectors: ["ICT"],
  beneficiary_groups: ["seniors_60_plus"],
  target_org_types: ["public_institution"],
  tags: [],
  organization_name: org,
  organization_type: "company",
  origin_location: "Rzeszów",
  deployment_level: "pilot",
  trl: 6,
  verification_status: "verified",
  last_verified_at: "2026-11-20",
  updated_at: "2026-11-20",
  scores: {
    innovativeness: 75,
    application_potential: 80,
    transferability: 70,
    credibility: 85,
  },
  missing_info: [],
  suggested_next_step: "Pilotaż",
});

const sampleDetail = (slug, overrides = {}) => ({
  ...sampleSummary(slug, slug, "PCI"),
  solution_pl: "Rozwiązanie",
  solution_en: "Solution",
  oslo_compliant: true,
  verification_method: "Rejestr publiczny",
  fetched_at: "2026-11-20",
  strengths: [],
  risks: [],
  conflicting_info: [],
  required_resources: [],
  metrics: [],
  partner_archetypes: [],
  sources: [],
  evidences: [],
  ...overrides,
});

test("buildSlotOptions disables slugs already chosen in other slots", () => {
  const summaries = [
    sampleSummary("alpha", "Alpha — System", "Org A"),
    sampleSummary("beta", "Beta — Platforma", "Org B"),
    sampleSummary("gamma", "Gamma — Narzędzie", "Org C"),
  ];
  const optionsForSlot1 = buildSlotOptions(summaries, ["alpha", "beta"], 1);
  assert.equal(optionsForSlot1[0].value, "");
  assert.equal(optionsForSlot1.find((o) => o.value === "alpha")?.disabled, true);
  assert.equal(optionsForSlot1.find((o) => o.value === "beta")?.disabled, false);
  assert.equal(optionsForSlot1.find((o) => o.value === "gamma")?.disabled, false);
});

test("updateCompareSlot updates, clears, appends, and ignores cross-slot duplicates", () => {
  assert.deepEqual(updateCompareSlot(["alpha", "beta"], 0, "gamma"), ["gamma", "beta"]);
  assert.deepEqual(updateCompareSlot(["alpha", "beta"], 2, "gamma"), [
    "alpha",
    "beta",
    "gamma",
  ]);
  assert.deepEqual(updateCompareSlot(["alpha", "beta", "gamma"], 1, ""), [
    "alpha",
    "gamma",
  ]);
  assert.deepEqual(updateCompareSlot(["alpha", "beta"], 1, "alpha"), ["alpha", "beta"]);
});

test("computeScoreRanges finds min and max across available scores", () => {
  const details = [
    sampleDetail("a", {
      scores: {
        innovativeness: 80,
        application_potential: 70,
        transferability: 70,
        credibility: 90,
      },
    }),
    sampleDetail("b", {
      scores: {
        innovativeness: 60,
        application_potential: 70,
        transferability: 50,
        credibility: 75,
      },
    }),
  ];
  assert.deepEqual(computeScoreRanges(details), {
    innovativeness: { min: 60, max: 80 },
    application_potential: { min: 70, max: 70 },
    transferability: { min: 50, max: 70 },
    credibility: { min: 75, max: 90 },
  });
});

test("computeKeyDifferences summarizes area, maturity, TRL, credibility, and match leaders", () => {
  const details = [
    sampleDetail("a", {
      title_pl: "System A — Podtytuł",
      primary_area: "technological",
      deployment_level: "deployed",
      trl: 8,
      verification_status: "verified",
      scores: { credibility: 92 },
    }),
    sampleDetail("b", {
      title_pl: "Program B — Podtytuł",
      primary_area: "educational",
      deployment_level: "prototype",
      trl: 4,
      verification_status: "pending_review",
      scores: { credibility: 64 },
    }),
  ];
  const matches = {
    a: { overall_score: 88 },
    b: { overall_score: 61 },
  };
  const notes = computeKeyDifferences(details, matches, {
    areaLabels: { technological: "Technologiczny", educational: "Edukacyjny" },
    deploymentLabels: { deployed: "Stosowane w praktyce", prototype: "Prototyp" },
    verificationLabels: { verified: "Zweryfikowany", pending_review: "Oczekuje na weryfikację" },
  });
  assert.equal(notes.length, 6);
  assert.match(notes[0], /Technologiczny vs Edukacyjny/);
  assert.match(notes[2], /TRL 4\/9 do TRL 8\/9/);
  assert.match(notes[3], /Program B \(Oczekuje na weryfikację\)/);
  assert.match(notes[4], /System A \(92%\)/);
  assert.match(notes[5], /System A \(88%\)/);
});
