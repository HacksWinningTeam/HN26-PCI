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

## 2. Current Implementation Status

### Stack & Infrastructure
- **Backend:** Python 3.12, Django 5.2 LTS, Django REST Framework, `drf-spectacular`, PostgreSQL 18 (`backend/`).
- **Frontend:** Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript, Tailwind CSS v4 (`frontend/`).
- **Proxy & Deployment:** Single-port Next.js proxy (`frontend/src/proxy.ts`), Docker Compose (`compose.yaml` / `compose.prod.yaml`).

### Implemented Foundations
- **Localization (`pl-PL` default / `en-US`):** `frontend/src/i18n/` with `localStorage` persistence (`hn26-locale`) and synchronous pre-hydration (`frontend/src/lib/prehydrate.ts`) (`DEC-001`).
- **WCAG 2.2 AA Accessibility System:** `AccessibilityProvider`, `AccessibilityMenu` (floating control), `/settings/accessibility`, 5 resolved themes (`light`, `dark`, `hc-black-white`, `hc-black-yellow`, `grayscale`), text scale `25%–200%`, link underlining, and browser `speechSynthesis` Read Aloud (`DEC-002`).
- **App Shell:** `AppShell` (`frontend/src/components/AppShell.tsx`) provides session-aware product navigation, skip-to-content and `<main id="main-content">`. Sidebar remains at the left; full-width navbar/footer frame centered content capped at 1600px. The unified discovery screen has one navigation entry and omits duplicate shell search (`DEC-012`–`DEC-014`).
- **Design System Gallery (`/design-system`):** Interactive token/component gallery (`frontend/src/app/design-system/`) with section search and hash navigation (`DEC-003`).

## 3. Domain Modules & Features Implemented

- **Unified discovery (`DEC-014`, T03):** `/innovations` joins catalog browsing and optional problem matching in one screen. Shared filters, grid/table, match explanations, favorites, comparison, exports and notifications remain available. `/solve` redirects to the problem state of this screen. Automated verification and manual review are tracked in `docs/tasks/T03-unified-discovery.md`.

- **Discovery layout (`DEC-015`–`DEC-017`, T03):** approved and implemented top search/filter panel replaces the filter sidebar, with full-width results, progressive disclosure of advanced criteria, selected-filter chips and a beneficiary multi-select. Filter reset retains query and adopter context; changed matching criteria request recalculation. Compact cards allocate extra height to description/metadata and stack footer actions at narrow card widths. Manual sign-off remains pending in T03.

## 4. Key Implementation Decisions & Trade-offs

*(Link to `DEC-XXX` entries in [`04-decisions.md`](04-decisions.md) and note runtime constraints, data source adapters, AI usage/fallbacks, and known limitations here.)*
