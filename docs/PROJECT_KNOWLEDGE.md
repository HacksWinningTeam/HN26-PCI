# PROJECT KNOWLEDGE — PCI / Radar Innowacji (Implementation)

> **Living document** describing **our implementation** as we build the solution to the HackNation 2026 PCI Radar Innowacji challenge.
> For the official challenge specification, organizer FAQ, judging criteria, and domain requirements, see [`TASK_KNOWLEDGE.md`](TASK_KNOWLEDGE.md).

## 1. Documentation Map

- **Challenge & Task Specification:** [`TASK_KNOWLEDGE.md`](TASK_KNOWLEDGE.md)
- **Project Brief & Requirements:** [`01-brief.md`](01-brief.md)
- **UI System & Tokens:** [`02-ui-system.md`](02-ui-system.md)
- **Accessibility System:** [`accessibility-system.md`](accessibility-system.md)
- **System Architecture:** [`03-architecture.md`](03-architecture.md)
- **Decision Log:** [`04-decisions.md`](04-decisions.md)
- **Implementation Plan:** [`05-plan.md`](05-plan.md)
- **Navigation & Access Boundaries:** [`USER_FLOW.md`](USER_FLOW.md) — Polish walkthrough and mentor demo scenario.

## 2. Current Implementation Status

### Stack & Infrastructure
- **Backend:** Python 3.12, Django 5.2 LTS, Django REST Framework, `drf-spectacular`, PostgreSQL 18 (`backend/`).
- **Frontend:** Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript, Tailwind CSS v4 (`frontend/`).
- **Proxy & Deployment:** Single-port Next.js proxy (`frontend/src/proxy.ts`), Docker Compose (`compose.yaml` / `compose.prod.yaml`).

### Implemented Foundations
- **Localization (`pl-PL` default / `en-US`):** `frontend/src/i18n/` with `localStorage` persistence (`hn26-locale`) and synchronous pre-hydration (`frontend/src/lib/prehydrate.ts`) (`DEC-001`).
- **WCAG 2.2 AA Accessibility System:** `AccessibilityProvider` and shared `AccessibilityPreferencesControls` in sheets opened from `PublicNavBar` / `SidebarUtilities`; 5 resolved themes (`light`, `dark`, `hc-black-white`, `hc-black-yellow`, `grayscale`), text scale `25%–200%`, link underlining, and browser `speechSynthesis` Read Aloud (`DEC-002`, `DEC-035`).
- **App Shell:** `AppShell` (`frontend/src/components/AppShell.tsx`) provides session-aware product navigation, skip-to-content and `<main id="main-content">`. Sidebar remains at the left; full-width navbar/footer frame centered content capped at 1600px. The unified discovery screen has one navigation entry and omits duplicate shell search (`DEC-012`–`DEC-014`).
- **Design System Gallery (`/design-system`):** Interactive token/component gallery (`frontend/src/app/design-system/`) with section search and hash navigation (`DEC-003`).

## 3. Domain Modules & Features Implemented

- **Unified discovery (`DEC-014`, T03):** `/innovations` joins catalog browsing and optional problem matching in one screen. Shared filters, grid/table, match explanations, favorites, comparison, exports and notifications remain available. `/solve` redirects to the problem state of this screen. Automated verification and manual review are tracked in `docs/tasks/T03-unified-discovery.md`.

- **Discovery layout (`DEC-015`–`DEC-017`, T03):** approved and implemented top search/filter panel replaces the filter sidebar, with full-width results, progressive disclosure of advanced criteria, selected-filter chips and a beneficiary multi-select. Filter reset retains query and adopter context; changed matching criteria request recalculation. Compact cards allocate extra height to description/metadata and stack footer actions at narrow card widths. Manual sign-off remains pending in T03.

- **Real ingestion channels (`DEC-027`, T07):** CORDIS, RUJ UJ, Nauka w Polsce RSS and OpenAlex PL use a limit of 10 candidates per refresh. `SourceFeed.sources` preserves provenance; source cards/API count distinct non-merged local innovations, including pending review, dynamically. Migration backfills existing default imports while preserving existing innovations and custom feeds. Full live refresh added 23 records with 0 source errors; automated verification is tracked in T07, manual sign-off pending.

- **Production harvesting (`DEC-028`, T08):** periodic worker, persistent pagination and PostgreSQL import lock. Migrations configure data sources. Startup independently creates missing hackathon admin/demo/tester accounts and example organization profiles when `BOOTSTRAP_DEMO_ACCOUNTS=true` (`DEC-032`). Operator APIs require PCI session roles. Automated checks passed; user sign-off remains pending.

## 4. Key Implementation Decisions & Trade-offs

- **CTT and school source coverage (`DEC-031`, T11):** two additional real channels use bounded catalogue discovery to import individual CTT UŁ technology offers for business and IBE school-innovation PDFs. Reuse periodic harvesting, source counts and assessment/review flow; migration adds configuration only. Live import added 20 real records (10 per channel), zero source errors; repeated sample imports were unchanged with stable counts/cursors. 72 backend tests, lint/typecheck/schema/migration checks and prod builds passed. Coverage spans all four FAQ source groups through selected publishers, not every named database or all municipalities/startups. Implementation/verification is tracked in `docs/tasks/T11-ctt-school-sources.md`; manual sign-off remains user-owned.

- **Quality assessments (`DEC-029`, T09):** source-grounded, versioned innovativeness/application-potential AI estimates and deterministic credibility indices reuse existing score/evidence UI. Integrated with import/update, PCI quality edits/merge and bounded real-record backfill. Local backfill processed 28 real records: 28 credibility indices, 9 application-potential scores, 1 innovativeness score; remaining dimensions explicitly unknown. One record has all three indices. Repeat without retries recalculated 0 records. Task remains `IN_PROGRESS` pending user manual sign-off. Scope, rubric and verification: `docs/tasks/T09-innovation-assessments.md`; AI processing is documented in `AI_USAGE.md`.

- **Classification provenance, Oslo 2018 & periodic re-classification (`DEC-030`, T10):** implemented (`IN_PROGRESS`, awaiting Docker/prod build verification & manual sign-off). Removed rule-based TRL inference from deployment keywords and guarded planned/future mentions; added field-level provenance labels (`Potwierdzone przez PCI`, `Ze źródła`, `Szacunek regułowy`, `Szacunek AI`, `Brak danych`) next to `TRL` and `deployment_level` across cards, catalog table, detail view, comparison, and CSV/Markdown exports; replaced default `oslo_compliant=True` with explicit two-criterion Oslo Manual 2018 evaluation and honest UI breakdown; upgraded changed-source ingestion to refresh full classification, deployment progression, Oslo status, and auto-extracted evidences while reserving conflict flags for TRL regressions and multi-source mismatches; added PCI editor controls for `deployment_level`, `trl`, and `oslo_compliant`.

- **PCI Impact Radar & real deployment outcome loop (`DEC-033`, T12):** implemented (`IN_PROGRESS`, awaiting manual browser verification). Added 4-stage live transfer funnel (`Utworzone plany → Rozpoczęte pilotaże → Potwierdzone wdrożenia → Zweryfikowane efekty`) and active transfers table as the default tab in `/admin` (`ImpactRadarPanel`), backed strictly by PostgreSQL records with zero mock data.

- **Feedback loop survey, real results attachment & transfer pair (`DEC-034`, T13):** implemented (`IN_PROGRESS`, awaiting manual browser verification). Added the `Jak przebiega Twoje wdrożenie?` 3-option survey (`Przygotowujemy się do pilotażu`, `Rozpoczęliśmy pilotaż`, `Zakończyliśmy wdrożenie`) at the end of `/workspace/plans/[id]` with expandable stage form (`metric_before`, `metric_after`, `outcome_visibility`, `brak danych`) and real file attachment upload/download/delete stored in PostgreSQL (`GET/POST/DELETE /api/implementation-plans/{id}/attachment/`). `/admin` (`Impact Radar` and `Wdrożenia`) displays completed deployments as `Sukces · Zakończone wdrożenie` between the searching organization and the innovation's source organization with direct attachment download. All 75 backend tests, lint/typecheck/schema/migration checks, and `make build-prod` passed.

## 5. Documentation and Data Flow (`DEC-036`)

- [`../README.md`](../README.md) describes the current product, startup accounts, routes and the path from discovery to reported results. `/admin` is the PCI panel; `/django-admin/` is Django Admin.
- [`../AI_USAGE.md`](../AI_USAGE.md) documents source text and organization context sent to Gemini, the quality-assessment process, prompt instructions, output validation and the progression from proposed targets to reported results.
- [`../DATA_SOURCES.md`](../DATA_SOURCES.md) documents six configured sources, persisted account/report data and access checks. It identifies `public_source_url` as an assessment helper and describes operator imports through URL validation and HTTP fetching.
