# `T09` — Source-Grounded Innovation Quality Assessments

- **Status:** `IN_PROGRESS`
- **Layer:** `Backend`
- **UI Design Required:** `No`
- **Depends On:** None (existing ingestion, catalog and score/evidence presentation)
- **Traces To:** REQ-06, REQ-12, DEC-029; organizer assessment/transparency requirements in TASK_KNOWLEDGE.md sections 1 and 6

## Goal & User Outcome

Users see preliminary innovativeness, application-potential and credibility assessments, with reasons and source material, in existing cards/detail/comparison. New real imports are assessed automatically; existing real records can be backfilled without recreating them.

## Scope & Non-Goals

- **In scope:** a documented versioned rubric, structured assessment metadata, numeric score projection, generated evidence explanations, ingestion/update/PCI-edit integration, bounded backfill command, existing APIs/backend exports, meaningful tests and all required checks.
- **Out of scope:** new screens/components, new AI provider/dependencies, changes to problem-match weights, an invented transferability score, patent novelty searches, certification of Oslo/TRL, filling missing contacts, notifications or new feeds. Do not reopen T04/T06 or mark other tasks verified.
- Preserve real-only harvesting and source/PCI evidence. Unknown assessments remain unknown. Do not mark an innovation PCI-verified because an automatic assessment succeeds.

## UI Design (Per-Task)

N/A — backend only. Existing card/detail/comparison score locations consume `Innovation.scores`; existing detail evidence list displays generated assessment reasons and limitations. No UI code changes are authorized by this task spec. If an implementation requires a new UI surface, use the per-task UI gate first.

## Implemented Rubric — Version 1 (`quality-v1`)

All three outputs are 0–100 preliminary indices, with method, limitations and evaluation timestamp. They are independent of query match percentages. A missing datum is not proof that an innovation lacks value.

### Innovativeness (`innovativeness`)

Assess the source's stated difference from an existing approach (40%), the significance of the stated improvement (40%), and support for that improvement through described comparisons/tests/results (20%). Each criterion receives an integer 0–4 or `unknown`, with a short reason and a source reference/excerpt. Anchors: 0 = explicit absence of a meaningful difference/improvement; 1 = minor/local change; 2 = concrete incremental improvement; 3 = substantial supported difference; 4 = unusually strong, explicitly documented difference and comparative support. Apply anchors to the criterion being evaluated, not to the prestige of its author. No patent/world-first claim can be inferred from a source's marketing wording.

### Application potential (`application_potential`)

Assess a concrete use case and intended users (30%), practical reuse/adaptation in other organizations or contexts (40%), and documented readiness/implementation conditions (30%). Grades 0–4 or `unknown`: 0 = an explicit substantial barrier or absence of applicability; 1 = narrow/conceptual application; 2 = a specified plausible application with open conditions; 3 = a supported practical application and feasible adaptation; 4 = strong documented implementation/reuse evidence. A concept can have potential; inferred TRL, default sectors/beneficiaries and generic generated descriptions are not sufficient evidence for high grades.

### AI grading and unknown values

- Request the two qualitative dimensions in the existing Gemini source-extraction call; calculate weighted numeric results in Python. Do not ask the model to invent percentages directly.
- Accept a criterion only if its grade has a reason and supporting excerpt traceable to an input source snapshot. Quote matching and range/type checks are mandatory. This validates traceability, not factual correctness; expose the result as an AI estimate.
- Calculate a dimension only if all its required criteria are supported; otherwise omit its numeric score and explain the missing basis. Do not silently renormalize weights across unknown criteria.
- Without Gemini, on timeout or with malformed/unsupported output, preserve the unknown state for the affected dimensions and still calculate credibility when possible. Report the limitation and allow later retry without new source data.

### Credibility (`credibility`)

Calculate a transparent index from five deterministic components:

| Component | Version 1 points |
| --- | --- |
| Traceable source material | 25 if a valid public HTTP(S) source URL has a non-empty stored snapshot; otherwise no total credibility score (`unknown`). |
| Linked evidence | 25 if there is a source-linked PCI-confirmed fact; otherwise 15 if there is a source-linked declaration traceable to the snapshot; otherwise 0. Generic generated keyword summaries do not qualify. |
| Actual PCI verification | 20 for `verified`; 0 for pending review, stale or conflict. |
| Freshness/availability | For eligible available sources: 15 if last fetched <=90 days ago, 10 for 91–180 days, 5 for >180 days; 0 if none is available or fetch dates are unknown/future. Use the most recent eligible source, recording which one. |
| Unresolved contradictions | 15 if no contradictions are recorded and status is not `conflict`; otherwise 0. Explain that absence of a recorded conflict is not proof of correctness. |

Record each component's awarded/max points and basis. Source date/access must not be described as independent factual verification. Deduplicate repeated source citations; generated assessment evidence and AI estimates never count as independent corroboration. Pending-review and conflicting records must visibly retain their limitations. This index describes evidence support, not the probability that source claims are true.

## Technical Implementation Plan

1. Add structured `Innovation.assessment` JSON metadata and migration; explicit nested DRF serializers document version, input hash, timestamp, dimension method/status, criteria, reasons, source references and limitations. Preserve numeric `scores` API shape and unrelated keys.
2. Add a small assessment service with pure rubric/validation helpers, deterministic credibility calculation and transactional persistence. Write generated `Evidence` with a stable identity so recalculation replaces only its own explanations. Do not count those explanations as independent evidence.
3. Extend the existing extraction response/prompt for qualitative criterion grades. Source text is untrusted data. Validate excerpts against the source snapshots. Prevent a failed attempt from silently reusing a stale grade after its source changes.
4. Assess imports after source/evidence persistence. Reassess when source content, source evidence, verification, conflicts or merged source sets change; skip unchanged completed inputs/rubric. Include a freshness component in cache invalidation. Keep calculation out of public GET requests.
5. Add an idempotent management command with dry-run, explicit limit and optional slug selection. Default to real non-merged records; use stored snapshots and the same import lock. Backfill must not seed, delete, change account/contact data or make old synthetic records public. Execute a dry-run before the local backfill after approval.
6. Include assessments/reasons in backend JSON/Markdown/CSV exports. Ensure comparison leaders and summary logic handle the three requested dimensions and missing assessments correctly, preserving legacy transferability data when present.
7. Document exact implemented constants, AI limitations and local results. No new environment variable or infrastructure expected. No network activity during migration/startup solely for backfill.

## Acceptance Criteria

- [x] Three independently explained quality dimensions are available through existing APIs and score locations for adequately supported source material.
- [x] Every generated numeric score has a method, rubric version, timestamp, source basis and limitations; unsupported novelty/applicability remains unknown.
- [x] The same inputs/version give stable deterministic aggregation; AI suggestions are explicitly labeled and cannot set verification status.
- [x] Import, relevant source changes and PCI edits/merge refresh scores; unchanged completed inputs avoid duplicate evidence/AI work.
- [x] Failed/invalid AI grading does not block harvesting or create invented scores; backfill can retry unknown assessments.
- [x] Backfill is bounded/idempotent, uses real stored records and preserves source/PCI evidence and user data.
- [x] Existing catalog/detail/comparison/export and 40/20/20/20 matching remain compatible.
- [x] Required automated checks and exact manual steps are recorded; user-owned sign-off remains pending.

## Verification Checklist

### Automated Checks

- [x] Unit tests: rubric limits, weighted totals, true zero versus unknown, source traceability, absent/invalid AI output, no fabricated high grades from default/inferred fields.
- [x] Credibility tests: independent source/evidence deduplication, own explanations excluded, pending review, real verification, stale/unavailable sources, contradictions and cache invalidation.
- [x] Integration/API tests: new/changed/unchanged imports, quality-affecting PCI edits/merge, backfill dry-run/idempotency/retry, serializer/export shape and comparison missing-score behavior. Includes separate worker connections under the shared import lock and retry preserving completed dimensions/legacy transferability.
- [x] `make test`: **62 passed** (23 added cases). 24 existing-category development WhiteNoise warnings for missing `/app/staticfiles/`; no failures. `make lint` passed (Ruff, TypeScript, ESLint). `make schema-check` and `make migrations-check` passed. Applied innovations 0003 locally without removing existing records.
- [x] `make build-prod` passed for backend and frontend; frontend build reused the unchanged cached build. Final backend image includes the latest assessment service/command/migration. No frontend code, dependencies, Compose, env or Dockerfile changes.
- [x] `git diff --check` passed. Dry-run selected 28 real records. Live stored-source backfill processed all 28: credibility 28, application potential 9, innovativeness 1; only 1 record had sufficient accepted evidence for all three dimensions. Remaining dimensions explicitly unknown. Repeat without `--retry-unknown` recalculated **0** records and reused stored results.

### Observed Local API Check — 2026-11-22 05:30

- Public detail for REVAIL returned 200, version `quality-v1`, three generated explanations and scores: innovativeness 50, application potential 68, credibility 55. These are preliminary indices from the saved source, not PCI verification.
- Public comparison of real records returned 200. Unit/API tests also cover numeric zero, partial assessments and exported explanations.
- No browser/manual sign-off or production deployment claimed. On production, after deployment/migrations, use the README's explicit backfill command for existing records; new imports are assessed automatically.

### Manual Verification

1. In `/innovations`, find **REVAIL** and open its detail. Check indices 50/68/55 and the three explanations in the evidence section; follow the supporting source. Open **ACCEND**: potential is 50, credibility 55 and innovativeness is unknown. These examples reflect the local backfill, not guaranteed future source content.
2. Compare the same records: numbers agree with detail/API; unknown dimensions remain absent rather than zero; the query-match score remains separate.
3. Refresh unchanged input: no duplicated assessment evidence. Change source/verification input in a controlled test and verify recalculation.
4. Inspect an incomplete record: explicit unknown reason and no claim of verified novelty. Export a record and check the assessment explanation.

### Sign-Off

- **Plan Approval:** 2026-11-22 05:19 — user: „dobra lecimy”.
- **Verified By:** — (awaiting user manual confirmation; automated verification completed).
- **Notes / Follow-Ups:** Implementation and local real-record backfill complete. Existing uncommitted `frontend/tsconfig.tsbuildinfo` remains outside scope. No commit, push or deployment. Task remains `IN_PROGRESS` until user confirms manual checks; no other task status changed.
- **Local checkpoint authorization:** 2026-11-22 05:32 — user explicitly requested committing these changes. Commit the T09 implementation, migration, tests and documentation; exclude `frontend/tsconfig.tsbuildinfo` and secrets. This authorizes a local checkpoint while manual sign-off remains pending, without changing the task to `VERIFIED`. No push or deployment authorized.
