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
- **Context / New Info:** User requested implementing language (`pl-PL` default / `en-US`) and appearance (`light` / `dark` / `system`) configuration early, referencing `/Users/kubamilcarz/Developer/investments-portfolio`.
- **Decision:** Add client-persisted `localStorage` preferences (`hn26-locale`, `hn26-appearance`) with a synchronous pre-hydration script in `RootLayout` `<head>` to prevent FOUC/flash of untranslated text, CSS `light-dark()` semantic tokens in `frontend/src/app/globals.css` maintaining WCAG 2.2 AA contrast in both light and dark themes, and accessible `LanguageSelector` + `AppearanceSelector` controls in the global header.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/i18n/`, `frontend/src/appearance/`.

### `DEC-002` — WCAG 2.2 AA Accessibility System Plan
- **Date:** 2026-11-21 14:27
- **Status:** Accepted
- **Context / New Info:** User requested planning WCAG 2.2 AA accessibility modeled on `/Users/kubamilcarz/Developer/HackYeah-2026/HackYeah2026-Defence`.
- **Decision:** Adopt the `AccessibilityProvider` preference contract (`appearance`: `system` | `light` | `dark` | `hc-black-white` | `hc-black-yellow` | `grayscale`, `textScale`: `25`–`200`, `underlineLinks`: boolean), pre-paint `getPrehydrateScript()` application, semantic CSS token maps for all 5 resolved themes, and a shared `AccessibilityPreferencesControls` component used by a floating `AccessibilityMenu` and `/settings/accessibility` (with `Read aloud` via `speechSynthesis` respecting `pl-PL` / `en-US`), documented in `docs/accessibility-system.md`.
- **Affected Docs & Tasks:** `docs/accessibility-system.md`, `docs/02-ui-system.md`, `frontend/src/app/globals.css`, `frontend/src/lib/prehydrate.ts`, `frontend/src/i18n/messages.ts`.

### `DEC-003` — Design System Gallery Structure (`/design-system`)
- **Date:** 2026-11-21 14:41
- **Status:** Accepted
- **Context / New Info:** Added a dedicated `/design-system` route aligned with the **PCI / Radar Innowacji** brief in `docs/PROJECT_KNOWLEDGE.md` to document UI foundations, shared tokens, and upcoming component patterns.
- **Decision:** Add `frontend/src/app/design-system/` with `gallery-navigation.ts` (section catalog, multi-word search, hash alias resolution, and disclosure-opening scroll helper), `gallery-navigation.test.mjs`, `GalleryShell` (sticky sidebar navigation + live search inside `AppShell`), and `page.tsx` with Foundations (Typography, Colors, Spacing), starter primitives (Buttons, Cards, Badges), and `Planned` slots.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `frontend/src/app/design-system/`, `frontend/src/components/AppShell.tsx`, `frontend/src/i18n/messages.ts`, `frontend/package.json`.

<!-- Template for new entries:
### `DEC-XXX` — `<Short Title>`
- **Date:** `<YYYY-MM-DD HH:MM from date '+%Y-%m-%d %H:%M'>`
- **Status:** Accepted | Superseded by DEC-YYY
- **Context / New Info:** `<What changed or what was decided>`
- **Decision:** `<Exact choice made>`
- **Affected Docs & Tasks:** `<e.g., docs/01-brief.md, docs/03-architecture.md, T03, T04>`
-->
