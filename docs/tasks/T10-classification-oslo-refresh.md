# `T10` — TRL/Deployment Provenance, Honest Oslo 2018 Assessment & Full Source Refresh

- **Status:** `IN_PROGRESS`
- **Layer:** `Full-Stack`
- **UI Design Required:** `Yes`
- **Depends On:** None (builds on existing ingestion pipeline, catalog/detail/compare/admin views, and T09 assessment recalculation)
- **Traces To:** REQ-06, REQ-12, DEC-030

## Goal & User Outcome

Users immediately see whether `TRL` and `deployment_level` are confirmed source/PCI facts or rule/AI estimates, see an honest two-criterion Oslo Manual 2018 evaluation instead of an automatic blanket confirmation badge, and receive up-to-date classification, deployment maturity, Oslo status, and evidence when a monitored source changes (such as a prototype progressing to deployment).

## Scope & Non-Goals

- **In Scope:**
  - **TRL & deployment rules + provenance (`backend/apps/ingestion/ai_service.py`, `backend/apps/innovations/exports.py`):**
    - Remove rule-based `TRL` inference from `deployment_level` keywords (`trl = 8/6/4`); keep `trl = None` unless explicitly stated in source text/metadata, suggested by AI, or confirmed by PCI.
    - Guard deployment-level keyword matching against planned/future mentions (e.g., „planowane wdrożenie”, „przed wdrożeniem”, „umożliwi wdrożenie”) so early concepts are not misclassified as `deployed`.
    - Standardize `classification_provenance` values (`source`, `rule_based`, `ai_suggested`, `pci_verified`, `unknown`) for `deployment_level`, `trl`, `oslo_compliant`, and classification fields.
    - Allow PCI operators to edit `deployment_level`, `trl`, and `oslo_compliant` in `/api/admin/innovations/{slug}/` and `/admin`, marking edited fields as `pci_verified`.
    - Include provenance labels for `TRL` and `deployment_level` in Markdown/CSV exports (`exports.py`, `radar-export.ts`).
  - **Oslo Manual 2018 assessment (`backend/apps/innovations/models.py`, `ai_service.py`):**
    - Change `Innovation.oslo_compliant` model default to `False` (via migration without deleting or rewriting existing manual records unless re-ingested/backfilled).
    - Evaluate both Oslo Manual 2018 criteria explicitly in `oslo_assessment`:
      1. `novelty_or_improvement` (`met` | `partial` | `unknown` | `not_met`) — concrete evidence of novelty or significant improvement over existing solutions.
      2. `availability_or_implementation` (`met` | `partial` | `unknown` | `not_met`) — solution actually made available to potential users or brought into practice (`pilot` / `deployed` or explicit release/use evidence; `concept` without release is not compliant).
    - Set `oslo_assessment.status` (`compliant` | `partial` | `needs_verification` | `non_compliant`), `method` (`ai_estimate` | `rule_based` | `pci_verified`), criterion reasons/excerpts, and `limitations`. Only set `oslo_compliant = True` when both criteria are satisfied (or PCI-verified).
  - **Full source-change refresh (`backend/apps/ingestion/pipeline.py`):**
    - When `existing_source.content_hash != new_hash`, refresh full classification (`title_pl`, `short_summary_pl`, `problem_pl`, `solution_pl`, `primary_area`, `innovation_character`, `sectors`, `beneficiary_groups`, `target_org_types`, `tags`, `organization_type`, `origin_location`, `deployment_level`, `trl`, `oslo_compliant`, `oslo_assessment`, `classification_provenance`, `patent_status`, `radar_user_types`, `missing_info`, `is_incomplete`) rather than only `short_summary_pl`.
    - Treat same-source forward progression (e.g., `prototype` → `pilot` → `deployed`, or `trl` increasing / `None` → explicit TRL) as an update (`outcome = "updated"`), moving `verified` or `stale` records to `pending_review` with full field diffs in `InnovationAuditLog` (`action="classification_update"`).
    - Preserve conflict detection (`outcome = "conflict"`, `verification_status = "conflict"`) when TRL regresses (`extracted["trl"] < inv.trl`) or multiple distinct sources disagree.
    - Refresh auto-extracted `Evidence` entries (`source_declaration`, `ai_estimate`, `missing_info`) on update while preserving PCI `verified_fact` entries and recalculating `assess_innovation`.
  - **Frontend provenance & Oslo display (`frontend/src/`):**
    - Type `classification_provenance` and `oslo_assessment` in `frontend/src/lib/radar-api.ts`.
    - Add provenance labels/badges next to `TRL` and `deployment_level` on compact cards, catalog table, detail view, and comparison matrix.
    - Replace the unqualified `"Zgodność z metodologią Oslo"` badge on `/innovations/[id]` with an accurate provenance-aware Oslo status badge and two-criterion breakdown.
- **Out of Scope:**
  - Changing the 40/20/20/20 problem-matching formula or T09 quality rubric weights.
  - Adding new external scraping channels or email notification delivery.
  - Reopening `T06` or `T04` outside the bounded `TRL`/`deployment_level` provenance cells on `/compare` and field inputs in `/admin`.

## UI Design (Per-Task)

- **Approved:** `2026-11-22 05:36` („tak lecimy”)
- **Route(s):** `/innovations`, `/innovations/[id]`, `/compare`, `/admin`
- **Reference Sketch / Assets:** None (reuses existing Praktoteka card, badge, definition-list, comparison-matrix, and inline admin-editor patterns from `docs/02-ui-system.md`).
- **Layout & Information Hierarchy:**
  ```text
  1. Compact Card (/innovations grid) & Table (/innovations table)
     [Area Badge] [Character] [TRL X/9 · Szacunek AI / Ze źródła / Fakt PCI] (omitted if TRL is null)
     dl.Gotowość: <Deployment Label> + compact provenance text ("Ze źródła" | "Szacunek regułowy" | "Szacunek AI" | "Potwierdzone przez PCI")

  2. Innovation Detail (/innovations/[id])
     Hero visual:
       topLeft: Verification Status Badge
       bottomLeft: Honest Oslo 2018 Badge ("Oslo 2018: potwierdzone przez PCI" | "wstępnie spełnione (szacunek)" | "częściowe" | "wymaga weryfikacji")
     Hero tags: [Area] [Characters] [Deployment · Provenance] [TRL X/9 · Provenance | TRL nie określono]
     KPI strip ("Poziom gotowości"):
       Deployment Label + Provenance Badge
       TRL X/9 (Provenance) | TRL nie określono (brak w źródle)
     Tab "Efekty i wskaźniki":
       New card "Ocena zgodności z Oslo Manual 2018":
         - Overall Oslo status badge + assessment method (AI / reguły / PCI)
         - Kryterium 1: Nowość lub istotne ulepszenie [StatusBadge] + reason + optional excerpt
         - Kryterium 2: Udostępnienie użytkownikom lub wdrożenie [StatusBadge] + reason
         - Limitations note ("Wstępna ocena..." / missing evidence explanation)

  3. Compare Matrix (/compare)
     Row "Poziom wdrożenia": [Deployment Badge] + provenance sub-label
     Row "TRL": "TRL X/9" or "Nie określono" + provenance Badge/sub-label

  4. PCI Admin Inline Editor (/admin -> "Jakość i weryfikacja" -> Edytuj)
     Existing title/location/status/method/summary row
     + Bounded classification confirmation row (3 cols):
       [Poziom wdrożenia (select + current provenance hint)]
       [TRL 1–9 lub puste (input + current provenance hint)]
       [Zgodność Oslo 2018 (select: Wymaga weryfikacji / Potwierdzona / Niespełniona)]
  ```
- **Components (Reused vs. New):**
  - Reused from `docs/02-ui-system.md`: `Badge`, `StatusIndicator`, `DefinitionList`, `Banner`, `Button`, `CardSurface`.
  - Shared helper utilities (no new global design-system primitives): `PROVENANCE_LABELS`, `PROVENANCE_SHORT_LABELS`, `OSLO_STATUS_LABELS`, `OSLO_CRITERION_LABELS` in `frontend/src/lib/radar-labels.ts`; small local sub-component/helper `ProvenanceBadge` or inline badge rendering in existing views (`InnovationCardCompact.tsx`, `innovations/[id]/page.tsx`, `compare/page.tsx`).
- **Interactive States:**
  - **Loading:** Existing page-level `LoadingState` skeletons/spinners remain unchanged.
  - **Empty / Unknown Values:** When `trl === null`, compact card omits fabricated TRL pill, detail/table/compare explicitly state `"TRL nie określono"` (or `"Nie określono"`) with `"Brak danych"` provenance instead of `"TRL nie dotyczy"` or guessed `TRL 8`. When `oslo_assessment` is missing on legacy records, fall back to `"Oslo 2018: wymaga weryfikacji"` (when `oslo_compliant === false`) or `"Oslo 2018: potwierdzone"` (only if PCI-verified).
  - **Error:** Admin editor save errors continue displaying the accessible `Banner` (`tone="error"`, `announcement="assertive"`); invalid TRL input (outside `1..9`) shows inline validation error before submitting.
  - **Success:** Saving PCI edits in `/admin` updates `classification_provenance` for modified fields to `pci_verified`, triggers assessment recalculation, shows `aria-live="polite"` success `Banner`, and refreshes the record across `/innovations`, `/innovations/[id]`, `/compare`, and CSV export.
- **API Fields & Contracts Consumed:**
  - `GET /api/innovations/`, `GET /api/innovations/{slug}/`, `POST /api/discovery/compare/` (all same-origin `/api/...`):
    - `deployment_level`, `trl`, `classification_provenance` (`{ deployment_level, trl, oslo_compliant, primary_area, innovation_character, sectors, beneficiary_groups }`), `oslo_compliant`, `oslo_assessment` (`{ status, method, compliant, novelty_status, novelty_reason, novelty_excerpt, availability_status, availability_reason, limitations }`).
  - `PATCH /api/admin/innovations/{slug}/`:
    - Optional request fields added: `deployment_level`, `trl` (`1..9 | null`), `oslo_compliant` (`boolean`), `oslo_assessment` (`object`).
- **WCAG 2.2 AA Checks:**
  - Light/theme-token compliance across all 5 accessibility themes (`--color-success-*`, `--color-warn-*`, `--color-info-*`, `--color-border-subtle`, `--color-text-muted`).
  - Non-color indicators: every provenance and Oslo status combines text labels (e.g. `Szacunek AI`, `Szacunek regułowy`, `Ze źródła`, `Potwierdzone przez PCI`, `Częściowe`, `Wymaga weryfikacji`) with semantic `Badge` tones—never color alone.
  - Form inputs in `/admin` (`<select>` / `<input type="number">`) have explicit `<label htmlFor>`, `min-h-11` (`>= 44px`) targets, visible `:focus-visible` outlines, and `aria-describedby` hints for current provenance.
  - Heading hierarchy preserved (`h2`/`h3`/`h4` sequential inside `#effects` tab).

## Technical Implementation Plan

- **Backend (`backend/`):**
  - Models / Migrations: `apps/innovations/models.py` (`oslo_compliant` default `False`) + migration `0004_*`.
  - Services: `apps/ingestion/ai_service.py` (TRL/deployment rules, Oslo 2018 criteria, provenance), `apps/ingestion/pipeline.py` (full source-change refresh, progression vs conflict, evidence refresh), `apps/innovations/exports.py`.
  - Serializers / Views: `apps/ingestion/serializers.py` & `views.py` (`AdminInnovationPatchSerializer` supporting `deployment_level`, `trl`, `oslo_compliant`, `oslo_assessment` with `pci_verified` provenance); `apps/innovations/serializers.py` (document `oslo_assessment` / `classification_provenance` cleanly for `drf-spectacular`).
  - Unit Tests: `apps/ingestion/tests.py` & `apps/innovations/tests.py` covering no TRL=8 fabrication, planned-deployment phrasing, Oslo partial/needs_verification/compliant cases, same-source progression `prototype` -> `deployed` + evidence refresh, TRL regression conflict, and PCI `pci_verified` edits.
- **Frontend (`frontend/`):**
  - `src/lib/radar-api.ts`, `src/lib/radar-labels.ts`, `src/lib/radar-export.ts`, `src/lib/radar-labels.test.mjs` / `radar-export.test.mjs`.
  - `src/components/InnovationCardCompact.tsx`, `src/app/innovations/page.tsx`, `src/app/innovations/[id]/page.tsx`, `src/app/compare/page.tsx`, `src/app/admin/page.tsx`.
- **Config / Env:** None.

## Acceptance Criteria

- [x] Rule-based extraction never infers `TRL 8` (or `6`/`4`) solely from a deployment keyword; missing TRL stays `null` with `unknown` provenance.
- [x] Every visible `TRL` and `deployment_level` across catalog cards, table, detail, comparison, and exports clearly states whether it is a source/PCI-verified fact or a rule/AI estimate.
- [x] Imports no longer default `oslo_compliant` to `True`; Oslo 2018 evaluates both novelty/improvement and user availability/implementation, and the detail view shows the honest status and criterion breakdown.
- [x] Changing an existing source during ingestion refreshes full classification, deployment maturity, Oslo status, and source-derived evidences; forward maturity/TRL progression updates the record instead of locking it as a conflict, while TRL regression/multi-source disagreement still flags a conflict.
- [x] PCI operators can edit/confirm `deployment_level`, `trl`, and `oslo_compliant` in `/admin`, recording `pci_verified` provenance and audit logs.
- [ ] All automated checks pass (`make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod`); manual verification confirmed by user.

## Verification Checklist

### Automated Checks
- [x] Local backend `pytest` (56 passed across `test_t10_classification.py`, `test_assessment.py`, `ingestion/tests.py`, `innovations/tests.py`, `core/tests.py`, `discovery/tests.py`, `implementation/tests.py`; `test_harvesting.py` was not re-run after T10 edits because its non-DB `test_worker_once_is_real_and_rejects_invalid_intervals` triggers SQLite `Database access not allowed` outside PostgreSQL/Docker).
- [x] Local `ruff check .` passed (0 errors), `npm test` passed (50/50 tests, 3 new T10 assertions), `npm run typecheck` passed (`tsc --noEmit`), and `npm run lint` passed (`eslint .`).
- [x] Local `DJANGO_DEBUG=True python manage.py spectacular --validate --fail-on-warn` passed (0 warnings/errors).
- [x] Local `DJANGO_DEBUG=True python manage.py makemigrations --check --dry-run` passed; generated `innovations/0004_alter_innovation_oslo_compliant.py`.
- [x] User-reported host verification (`2026-11-22 05:45`): user confirmed Docker/build checks passed („przeszlo mordo”) and authorized local checkpoint commit; exact command logs were not pasted and manual browser walkthrough was not separately detailed, so status remains `IN_PROGRESS`.

### Manual Verification
1. Inspect a newly ingested record without explicit TRL in `/innovations` and `/innovations/[slug]`: confirm `TRL` is absent (`TRL nie określono` / `brak danych`) instead of fabricated `TRL 8`, and `deployment_level` shows `Szacunek regułowy` / `Szacunek AI`.
2. Inspect Oslo 2018 badge and criteria breakdown on an early-stage (`concept`/`prototype`) vs `deployed` innovation: confirm early-stage records are not shown as unqualified Oslo-compliant.
3. Re-ingest an existing source URL whose text progresses from `prototyp` to `wdrożone w praktyce` (or TRL 4 → TRL 7): confirm the record updates to `deployed`, refreshes its evidences and Oslo assessment, and writes an audit log without getting stuck on `prototype` or `conflict`.
4. Confirm/edit `TRL` and `deployment_level` in `/admin`: confirm provenance switches to `Potwierdzone przez PCI` across detail, compare, and CSV export.

### Sign-Off
- **Verified By:** — (awaiting explicit manual browser confirmation; user confirmed host checks passed on `2026-11-22 05:45`)
- **Notes / Follow-Ups:** Local checkpoint commit authorized (`2026-11-22 05:45`), excluding `frontend/tsconfig.tsbuildinfo` and `.env`/secrets. No `git push` or deployment performed. Task remains `IN_PROGRESS` until manual browser verification is explicitly confirmed.
