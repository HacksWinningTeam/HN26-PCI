# 04 — Decision & Change Log

> Append-only log of architecture decisions, requirement clarifications, UI pivots, and mid-hackathon scope changes. Every agent must read this file before designing or implementing any task.

## When to Add a Decision (`DEC-XXX`)

- At kickoff when establishing initial MVP scope and constraints (`DEC-001`).
- Whenever new organizer info, mentor feedback, or extra user notes arrive.
- Whenever a task's UI design requires adding/changing API endpoints, models, or shared UI primitives.
- Whenever a planned task is split, modified, or `CANCELLED`.

## Decisions

### `DEC-000` — Template Baseline & Architecture Invariants
- **Date:** Initial template setup
- **Status:** Accepted
- **Context:** Full-stack hackathon template targeting fast vertical slices and automatic Hetzner deployment.
- **Decision:** Keep single-port Next.js 16 proxying (`frontend/src/proxy.ts` + `skipTrailingSlashRedirect`), PostgreSQL 18 (`/var/lib/postgresql`), `uv` (`/opt/venv`), WCAG 2.2 AA light UI baseline, mandatory unit tests + lint/typecheck/schema checks, and manual `git push`.
- **Affected Docs & Tasks:** `AGENTS.md`, `docs/02-ui-system.md`, `docs/03-architecture.md`.

### `DEC-001` — Language (i18n) and Appearance (Light / Dark / System) Configuration
- **Date:** 2026-11-21 14:22
- **Status:** Accepted
- **Context / New Info:** User requested implementing language (`pl-PL` default / `en-US`) and appearance (`light` / `dark` / `system`) configuration early.
- **Decision:** Add client-persisted `localStorage` preferences (`hn26-locale`, `hn26-appearance`) with a synchronous pre-hydration script in `RootLayout` `<head>` to prevent FOUC/flash of untranslated text, CSS `light-dark()` semantic tokens in `frontend/src/app/globals.css` maintaining WCAG 2.2 AA contrast in both light and dark themes, and accessible `LanguageSelector` + `AppearanceSelector` controls in the global header.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/i18n/`, `frontend/src/appearance/`.

### `DEC-002` — WCAG 2.2 AA Accessibility System Plan
- **Date:** 2026-11-21 14:27
- **Status:** Accepted
- **Context / New Info:** User requested planning WCAG 2.2 AA accessibility preferences, semantic theme tokens, and Read Aloud controls.
- **Decision:** Adopt the `AccessibilityProvider` preference contract (`appearance`: `system` | `light` | `dark` | `hc-black-white` | `hc-black-yellow` | `grayscale`, `textScale`: `25`–`200`, `underlineLinks`: boolean), pre-paint `getPrehydrateScript()` application, semantic CSS token maps for all 5 resolved themes, and a shared `AccessibilityPreferencesControls` component used by a floating `AccessibilityMenu` and `/settings/accessibility` (with `Read aloud` via `speechSynthesis` respecting `pl-PL` / `en-US`), documented in `docs/accessibility-system.md`.
- **Affected Docs & Tasks:** `docs/accessibility-system.md`, `docs/02-ui-system.md`, `frontend/src/app/globals.css`, `frontend/src/lib/prehydrate.ts`, `frontend/src/i18n/messages.ts`.

### `DEC-003` — Design System Gallery Structure (`/design-system`)
- **Date:** 2026-11-21 14:41
- **Status:** Accepted
- **Context / New Info:** Added a dedicated `/design-system` route aligned with the **PCI / Radar Innowacji** brief in `docs/PROJECT_KNOWLEDGE.md` to document UI foundations, shared tokens, and upcoming component patterns.
- **Decision:** Add `frontend/src/app/design-system/` with `gallery-navigation.ts` (section catalog, multi-word search, hash alias resolution, and disclosure-opening scroll helper), `gallery-navigation.test.mjs`, `GalleryShell` (sticky sidebar navigation + live search inside `AppShell`), and `page.tsx` with Foundations (Typography, Colors, Spacing), starter primitives (Buttons, Cards, Badges), and `Planned` slots.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `frontend/src/app/design-system/`, `frontend/src/components/AppShell.tsx`, `frontend/src/i18n/messages.ts`, `frontend/package.json`.

### `DEC-004` — Full-Stack End-to-End Flow Refactor & Per-View Session Auth
- **Date:** 2026-11-21 19:29
- **Status:** Accepted
- **Context / New Info:** Consolidated the 13-point end-to-end user flow (`docs/inputs/my-notes.md`, `docs/03-architecture.md`) separating `primary_area` (3), `innovation_character` (4), and `location`, implementing 40/20/20/20 problem matching, three-tier innovation detail, session auth gate, 3 maturity-aware 5-phase implementation plan variants, and the PCI Admin quality + adoption console.
- **Decision:** Implemented Django apps `apps.innovations`, `apps.discovery`, `apps.accounts`, `apps.implementation`, and `apps.ingestion` with `seed_demo`. Kept `REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = []` for public endpoints and enabled `SessionAuthentication` explicitly on account/implementation/admin views with `X-CSRFToken` forwarding in `frontend/src/lib/api.ts`.
- **Affected Docs & Tasks:** `docs/03-architecture.md`, `backend/apps/*`, `frontend/src/*`.

### `DEC-004` — User Roles and Problem-to-Implementation Product Flow
- **Date:** 2026-11-21 18:44
- **Status:** Accepted
- **Context / New Info:** The product direction was clarified after reviewing the organizer brief and FAQ. The primary Radar user is not an innovation creator submitting a project. It is a person looking through existing projects or describing a problem in order to find an implementable solution. Audience groups such as children, seniors, or people with disabilities describe beneficiaries of an innovation, not account roles. Registration, personalized implementation planning, progress tracking, and PCI oversight were added to the product concept.
- **Decision:** Provide two public discovery entrances: browsing existing innovations and describing a problem. Both lead to ranked innovation matches with transparent evidence. Public users can inspect and compare records. Registration is requested only when a user wants a personalized five-step implementation plan, available verified contact details, saved comparisons, or progress tracking. The registered user represents an organization or initiative interested in adoption and completes a short organization/context questionnaire. Innovation creators do not need accounts; creator and organization data are collected from public sources. PCI administrators verify records, manage ingestion quality, and can inspect implementation-plan progress. Beneficiary groups remain innovation metadata and search filters. The system is not a public innovation-submission portal, social network, crowdfunding product, or investor-search tool.
- **Affected Docs & Tasks:** `AGENTS.md`, `docs/01-brief.md`, `docs/02-ui-system.md`, `docs/03-architecture.md`, `docs/05-plan.md`; concrete `TXX` task specs will be created by `hackathon-plan` after kickoff approval because the master plan is still an uninitialized template.

### `DEC-005` — Matching, Information Depth, and Implementation Plan Contracts
- **Date:** 2026-11-21 19:02
- **Status:** Accepted
- **Context / New Info:** The user resolved open questions identified during the product-flow review: taxonomy levels, match-score composition, questionnaire purpose, maturity-aware plans, nested card depth, contact placement, PCI visibility, notification input, and AI responsibility.
- **Decision:** Keep innovation area and geographic location as separate fields and use the correct `TRL` abbreviation. Model `technological`, `educational`, and `administrative` as primary areas, while `product`, `process`, `organizational`, and `social` are independent innovation-character tags. Problem-search results use an explainable normalized score: problem similarity 40%, sector 20%, beneficiary group 20%, and applicability to the user's organization type 20%; the UI exposes this breakdown and never presents it as implementation-success probability. The organization type comes from the registered-user questionnaire, which also captures location, scale, current approach, resources, competencies, target date, and constraints. Information is nested across three levels: compact result card, public detail, and registered discovery layer containing the maturity-appropriate plan and contact information needed to execute it. Plans use one of three variants (`validation`, `pilot`, `transfer/deployment`) but share five phases: fit confirmation, contact/materials, organization readiness, pilot/execution, and evaluation/scaling. Rules select the plan variant and facts; AI may personalize wording without inventing evidence. PCI administrators can inspect comparison and plan-progress details. “Notify me” collects only an email address and uses the account email when authenticated.
- **Affected Docs & Tasks:** `AGENTS.md`, `docs/01-brief.md` (`REQ-03`, `REQ-04`, `REQ-06`, `REQ-08`–`REQ-11`, `REQ-13`), `docs/02-ui-system.md`, `docs/03-architecture.md`, `docs/05-plan.md`; no task statuses or approvals reset because the real task plan has not yet been generated.

<!-- Template for new entries:
### `DEC-XXX` — `<Short Title>`
- **Date:** `<YYYY-MM-DD HH:MM from date '+%Y-%m-%d %H:%M'>`
- **Status:** Accepted | Superseded by DEC-YYY
- **Context / New Info:** `<What changed or what was decided>`
- **Decision:** `<Exact choice made>`
- **Affected Docs & Tasks:** `<e.g., docs/01-brief.md, docs/03-architecture.md, T03, T04>`
-->
