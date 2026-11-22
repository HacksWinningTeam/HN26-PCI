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

### `DEC-006` — Scoped Table Primitives (`SimpleTable`, `DataTable`, `Popover`)
- **Date:** 2026-11-21 23:20
- **Status:** Accepted
- **Context / New Info:** Working on the design system (`@/components/ui` and `/design-system`), the user requested a structured table system with sensibly limited functionalities suited to Radar Innowacji / PCI.
- **Decision:** Implement a clean, focused table suite adapted to `globals.css` semantic tokens (`Brand Cyan` / `Brand Lime`, all 5 WCAG themes) and `LocaleProvider` (`pl-PL` / `en-US`): `SimpleTable` (striping, sticky header, row headers, horizontal/vertical scroll, empty state) and `DataTable` (toolbar with `CompactSearch`, sort/filter/options `Popover`s, header sort buttons, pagination + `PageJump`, pinned first column, horizontal overflow scrolling, row selection with floating `TableSelectionMenu` capsule, `TableDetailDrawer` using `Drawer` + `DefinitionList`, row actions, and loading/refreshing/error/empty/no-results states). Intentionally excluded table footers (`tfoot`/aggregates), `DateFilter`, spreadsheet cell-range drag selection/copy, column drag-and-drop reordering, manual column drag resizing/autofit, `localStorage` saved views, and multi-wallet color palettes.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `frontend/src/components/ui/`, `frontend/src/app/design-system/data-display-examples.tsx`, `frontend/src/i18n/messages.ts`, `frontend/package.json`.

### `DEC-007` — Brand Icons and Organic Photo Frames
- **Date:** 2026-11-21 23:50
- **Status:** Accepted
- **Context / New Info:** User approved adding photo shapes matching the supplied screenshot and requested a local commit together with the existing themed icon set.
- **Decision:** Keep 24 token-driven brand icons across light, dark, both high-contrast themes and grayscale. Add reusable `BrandPhoto` with three organic masks (`pebble`, `arch`, `hillside`), optional cyan/lime decorative bursts, responsive image cropping and required alternative text. Use unique SVG identifiers per instance for photo masks and bulb gradients. Document examples in the existing `/design-system` icon section, including grayscale preview. Photos are explicitly demo assets. The screenshot and explicit implementation request approve this bounded design-system addition; no product flow, API contract or task status changes.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, `frontend/src/components/ui/`, `frontend/src/app/design-system/`, `frontend/src/app/globals.css`, `frontend/public/design-system/`. No active TXX spec exists in the template plan.
- **Verification:** Automated tests and build checks omitted at the user's explicit request (2026-11-21 23:52); do not treat this commit as verified.

### `DEC-008` — Public Navbar for Landing and Account Pages
- **Date:** 2026-11-22 00:24
- **Status:** Accepted
- **Context / New Info:** User requested a simple top navigation pattern for the landing page and future login/signup views, with settings, accessibility, and account access, showcased in the design system. User subsequently removed the explicit home-return link.
- **Decision:** Add reusable `PublicNavBar` and replace the older application-header preview in Navigation bars with landing/login/register previews. Landing exposes catalog and solution-search links; account variants retain logo, settings, accessibility, and the opposite account action. Logo links home without an additional return link. Keep utility buttons visible on mobile; use an accessible disclosure for other links. Reuse existing sheets, language selection, accessibility controls, theme tokens, and localization. This bounded design-system request authorizes implementation in the gallery; product-route integration remains future work.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, `frontend/src/components/ui/`, `frontend/src/app/design-system/`, `frontend/src/i18n/messages.ts`. No active TXX exists in the template plan; task statuses and approvals are unchanged.

### `DEC-009` — Compact Mobile Application Shell
- **Date:** 2026-11-22 00:29
- **Status:** Superseded by DEC-010 (sidebar-collapse scope only; other mobile rules remain accepted)
- **Context / New Info:** User requested a mobile shell without breadcrumbs, a single row for menu/title/icon actions, and removal of sidebar collapse. The initial request for search in a second row was corrected: mobile search belongs inside the expanded sidebar menu.
- **Decision:** Keep desktop breadcrumbs and navbar search. On mobile, hide breadcrumbs, use named icon actions alongside menu/title, and show the shared search query within the expanded sidebar. Remove sidebar collapse props, toggle, and rail styles globally. Update the actual gallery shell and its interactive responsive/mobile example. This is the user's explicit design-system implementation request; no product routes or API contracts change.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, `frontend/src/components/ui/{sidebar,sidebar-utilities,nav-bar,app-shell-layout}*`, `frontend/src/app/design-system/{gallery-shell,app-shell-examples}.tsx`, `frontend/src/i18n/messages.ts`. The master plan still has template tasks; no statuses or approvals changed.

### `DEC-010` — Keep Desktop Sidebar Collapse
- **Date:** 2026-11-22 00:31
- **Status:** Accepted
- **Context / New Info:** User clarified that removal of sidebar collapse applies only to mobile; its global removal in DEC-009 was an incorrect interpretation.
- **Decision:** Restore desktop collapse controls, state/props, icon rail, and shell width adjustment. Hide the collapse control on mobile and always display full logo and labels there, regardless of remembered desktop state. Apply the same rule to the forced mobile gallery preview. Keep mobile breadcrumbs, icon actions, and search placement as established in DEC-009.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, sidebar components/styles, shell styles, gallery preview, and localization. No task statuses changed.

### `DEC-011` — Centered Application Shell Width Limit
- **Date:** 2026-11-22 01:25
- **Status:** Superseded by DEC-012
- **Context / New Info:** User explicitly requested limiting the existing application shell width, then instructed that Docker must not be used for this change.
- **Decision:** Cap the shared `AppShellLayout` at 1600px, including its sidebar and padding, and center it horizontally. Keep width fluid below the cap, preserving the existing mobile layout and viewport scrolling. This is a bounded refinement explicitly requested for implementation; product flow and API contracts are unchanged.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, `frontend/src/components/ui/app-shell-layout.module.css`. No active TXX spec exists in the template plan; no task statuses or approvals changed.
- **Verification:** Local `npm run typecheck` and `git diff --check` passed. `npm run lint` found five existing `react-hooks/set-state-in-effect` errors in untouched files (`innovations/page.tsx`, `solve/page.tsx`, `AppShell.tsx`, `SessionProvider.tsx`). Docker-based checks, including the production image build, omitted at the user's explicit request.

### `DEC-012` — Left Sidebar and Full-Width Navbar Background
- **Date:** 2026-11-22 01:26
- **Status:** Accepted
- **Context / New Info:** User refined DEC-011: sidebar must stay at the left and navbar background must stretch across the available width.
- **Decision:** Remove the width cap from the shell itself. Center and limit only the content/footer and inner navbar layout to 1600px using the shared `--app-shell-content-max-width` property. Keep navbar background/border full-width in the right column and preserve existing sidebar padding, mobile behavior, and scroll regions. This explicit implementation request authorizes the bounded refinement; no API or product-flow changes.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, `frontend/src/components/ui/{app-shell-layout,nav-bar}.module.css`. No active TXX spec or status changes.
- **Verification:** Local `npm run typecheck`, scoped ESLint for `AppShellLayout`/`NavBar`, and `git diff --check` passed. Docker remains excluded at the user's request; full lint's previously observed unrelated errors remain outside this change.

### `DEC-013` — Full-Width Footer Background
- **Date:** 2026-11-22 01:27
- **Status:** Accepted
- **Context / New Info:** User requested the same full-width background behavior for the footer and authorized a local commit of these shell refinements.
- **Decision:** Keep the scrolling content container full-width and move the 1600px cap to the page itself and the footer's inner contents. Footer background/border spans the right column like the navbar. Preserve the public footer's existing width/padding and footer placement after content.
- **Affected Docs & Tasks:** `docs/02-ui-system.md`, `docs/05-plan.md`, `frontend/src/components/ui/{app-shell-layout.module.css,app-footer.tsx}`. No active TXX spec or status changes.
- **Verification:** Local `npm run typecheck`, scoped ESLint for `AppShellLayout`/`NavBar`/`AppFooter`, and `git diff --check` passed. Docker excluded at the user's request; full lint's previously observed unrelated errors remain outside this change.

### `DEC-014` — Merge Catalog and Problem Discovery
- **Date:** 2026-11-22 02:08
- **Status:** Accepted
- **Context / New Info:** User approved the proposed single „Szukaj innowacji” screen with shared search/filter/results and optional detailed problem context, and requested implementing this consolidation before further work.
- **Decision:** Use `/innovations` as the canonical screen. Keep keyword/catalog browsing as the default and explicitly expand problem matching rather than infer it invisibly from text length. Reuse the existing catalog and discovery APIs; apply common constraints/sorting to both returned lists. Retain grid/table, comparison, saved innovations, implementation indicators, exports, notifications and actual 40/20/20/20 explanations. Distinguish adopter organization/deployment location from source organization/origin filters. Mark scores as needing recalculation after context edits. Replace the two product sidebar entries with one, omit duplicate shell search on this screen, and redirect `/solve` with query parameters preserved. Both landing entrances open states of the same screen. The user's explicit instruction approves this design and implementation; T03 remains `IN_PROGRESS` pending manual confirmation. Deadline/code freeze remain unspecified in the brief.
- **Affected Docs & Tasks:** `AGENTS.md`, `docs/PROJECT_KNOWLEDGE.md`, `docs/01-brief.md` (`REQ-02`–`REQ-05`), `docs/02-ui-system.md`, `docs/03-architecture.md`, `docs/05-plan.md`, T03, frontend discovery/navigation. Product scope and existing APIs remain unchanged.
- **Verification:** Recorded in T03. Docker is excluded per the user's earlier instruction.

### `DEC-015` — Horizontal Discovery Filters
- **Date:** 2026-11-22 02:18
- **Status:** Accepted
- **Context / New Info:** User supplied a screenshot of `/innovations` and requested combining filters at the top because a filter sidebar beside the application sidebar crowds the result cards.
- **Decision:** Refine T03 with one search/filter surface above full-width results. Keep area, sector, beneficiaries and deployment level visible; reveal character, minimum TRL, origin, source organization and verification in an inline “Więcej filtrów” disclosure. Show removable active-filter chips, retain optional problem context and distinguish source/adopter fields. Keep the existing application sidebar and shared theme tokens. The detailed design was presented for review and approved below. Previous DEC-014 product/API behavior remains valid; its two-column filter layout is replaced. Deadline/code freeze remain unspecified; this is a bounded frontend layout change.
- **Affected Docs & Tasks:** `docs/01-brief.md` (REQ-02, REQ-05), `docs/02-ui-system.md`, `docs/05-plan.md`, `docs/PROJECT_KNOWLEDGE.md`, T03. T03 returns from `IN_PROGRESS` to `DESIGN_REVIEW`; prior design approval and layout verification do not cover this proposal. No model, API, route or environment changes; `docs/03-architecture.md` contracts remain valid.
- **Approval:** 2026-11-22 02:22 — user approved the presented design and implementation (“no to jazda”). T03 moved through `DESIGN_READY` to `IN_PROGRESS`.
- **Verification:** Implementation and check results tracked in T03. No Docker commands, commit or push.

### `DEC-016` — Align Compact Card Potential Blocks
- **Date:** 2026-11-22 02:25
- **Status:** Accepted
- **Context / New Info:** User supplied a screenshot of unequal-height card content and explicitly requested stretching the first section rather than leaving empty space under implementation potential.
- **Decision:** Let description/metadata absorb available card height; keep potential and action sections at natural height and align them at the bottom of equal-height grid cards. This is an explicitly approved bounded layout correction within T03, without new functionality or contracts.
- **Affected Docs & Tasks:** T03 (`docs/tasks/T03-unified-discovery.md`), `frontend/src/components/InnovationCardCompact.tsx`. Product requirements, shared primitives and API architecture remain unchanged.

### `DEC-017` — Stack Actions on Narrow Innovation Cards
- **Date:** 2026-11-22 02:26
- **Status:** Accepted
- **Context / New Info:** User supplied a screenshot of a share action wrapping alone and explicitly requested a column of buttons when the card is narrow.
- **Decision:** Use a named card container query: below 25rem of card width, stack the details, compare and share actions at full width; otherwise place them in a single row. Keep >=44px targets and let rem sizing respect text scaling. This small layout correction is explicitly authorized for implementation.
- **Affected Docs & Tasks:** T03, `frontend/src/components/InnovationCardCompact.tsx`; no changes to API contracts or product scope.

### `DEC-018` — Simplify PCI Operations UI
- **Date:** 2026-11-22 02:31
- **Status:** Accepted (cleanup scope; detailed design awaits approval)
- **Context / New Info:** User requested tidying and “unslopping” the existing admin panel. The current UI uses five large statistic/filter cards, a full-width editor above the records table, and boxed source/implementation lists.
- **Decision:** Create T04 for a bounded cleanup of `/admin`: compact labeled filters with counts, neutral lists/tables, shorter action labels, an on-demand record editor and expandable implementation details. Keep the four existing operator sections and all current operations. No new metrics, APIs, models, permissions or dependencies. Detailed UI proposal is in T04 at `DESIGN_REVIEW`; implementation awaits explicit design approval. T03 and its existing approval/status are unaffected. Deadline/code freeze remain unspecified.
- **Affected Docs & Tasks:** `docs/01-brief.md` (REQ-11), `docs/05-plan.md`, new `docs/tasks/T04-admin-cleanup.md`. Existing architecture and shared UI tokens/primitives suffice, so `docs/02-ui-system.md` and `docs/03-architecture.md` contracts remain unchanged.

### `DEC-019` — Demo PCI Login Opens Admin
- **Date:** 2026-11-22 02:35
- **Status:** Accepted
- **Context / New Info:** User explicitly requested that the demo PCI admin login open the admin panel instead of the adopter workspace.
- **Decision:** After successful login via “Demo PCI”, navigate directly to `/admin`, including when the login URL contains a different `next` destination. Load the destination using the newly established server session before refreshing client auth, avoiding a competing workspace redirect from the shared login-page guard. Standard login and organization demo keep their existing behavior. This bounded behavior correction is explicitly authorized; T04's pending visual design remains unchanged.
- **Affected Docs & Tasks:** `frontend/src/app/login/page.tsx`, `docs/05-plan.md`, new T05. No API, model, shared UI or architecture contract changes.

### `DEC-020` — Admin-Only Navigation
- **Date:** 2026-11-22 02:36
- **Status:** Accepted
- **Context / New Info:** User explicitly requested removing “Moje wdrożenia” from admin and keeping only admin tabs.
- **Decision:** Remove the personal workspace sidebar entry from `/admin` at all widths. Retain Quality/verification, Duplicates, Public sources and Organization implementations. Point the admin logo and home breadcrumb to `/admin` so navigation stays in the operator context. This narrow UI correction is explicitly authorized independently of T04's broader design proposal, which remains `DESIGN_REVIEW`.
- **Affected Docs & Tasks:** `frontend/src/app/admin/page.tsx`, T04, `docs/05-plan.md`. No routes, API, model, environment or shared component changes.

### `DEC-021` — Shared Table in PCI Quality Review
- **Date:** 2026-11-22 02:38
- **Status:** Superseded by DEC-022
- **Context / New Info:** User explicitly requested using the existing table component in “Jakość i weryfikacja”.
- **Decision:** Replace the custom native table markup with `SimpleTable` and typed columns for innovation/origin, status, full issues, verification date and actions. Reuse the component's named scroll region, headers and row styling. Keep the current search, filters, priority ordering, editor, verification and public-card links. No new sorting, pagination or selection behavior is required. Table actions retain >=44px targets. This specific component replacement is approved by the user's instruction; T04's broader redesign remains pending.
- **Affected Docs & Tasks:** `frontend/src/app/admin/page.tsx`, T04, `docs/05-plan.md`. No changes to shared primitives, API, routes, models or environment.

### `DEC-022` — Advanced PCI Quality DataTable
- **Date:** 2026-11-22 02:40
- **Status:** Accepted
- **Context / New Info:** User clarified that the quality-review screen must use the advanced table, not `SimpleTable`.
- **Decision:** Replace `SimpleTable` with the existing `DataTable`. Enable sorting by innovation, status and verification date; text filters for innovation/origin and issues, a labeled status category filter, pagination, page-size and visible-column controls. Retain one shell search, existing quality-category filters, record priority as the unsorted default, and all row actions. Reset page when shell query/category changes; a whole-filter reset clears table state too. No row selection/bulk operations or detail drawer required for this bounded replacement. Existing API/model contracts and T04's pending broader cleanup design are unchanged. The user's correction explicitly authorizes this component/configuration change.
- **Affected Docs & Tasks:** T04, `docs/05-plan.md`, `frontend/src/app/admin/page.tsx`. DEC-021 superseded; no changes to shared components or dependencies.

### `DEC-023` — Innovation Comparison Screen Redesign Proposal (`/compare`)
- **Date:** 2026-11-22 02:42
- **Status:** Accepted (design proposal scope; awaits user approval before implementation)
- **Context / New Info:** User requested bringing the final unpolished screen — `/compare` (`frontend/src/app/compare/page.tsx`) — up to the design system and accessibility quality of the rest of the application.
- **Decision:** Create `T06` (`docs/tasks/T06-compare-redesign.md`) at `DESIGN_REVIEW` for a bounded frontend redesign of `/compare` reusing `@/components/ui` (`Dropdown`, `Button`, `Badge`, `StatusIndicator`, `Banner`, `CardSurface`, `Switch`, `LoadingState`, `EmptyState`, `ErrorState`) without backend/API changes or new global UI primitives. Add slot duplicate prevention, loading/error recovery, 40/20/20/20 match breakdown visibility, origin location, required resources, a „Tylko różnice” filter, and non-color leader badges (`CheckCircleIcon` + text). Implementation awaits explicit user approval of the UI design (`DESIGN_READY`).
- **Affected Docs & Tasks:** `docs/05-plan.md`, new `docs/tasks/T06-compare-redesign.md`. No API, model, route, or shared primitive changes.

### `DEC-024` — Simplify `/compare` Layout & Align with Praktoteka Visual Pattern
- **Date:** 2026-11-22 02:48
- **Status:** Accepted
- **Context / New Info:** After reviewing the redesigned `/compare` screen, user noted it looked good overall, asked for it to be simpler ("ogolnie to jest spoko ale moze byc prosciej"), and aligned neatly with the rest of the Praktoteka application ("ma być ładnie, schludnie i praktotetycznie tak jak cała reszta aplikacji").
- **Decision:** Combine the top summary/actions and the 3-slot `Dropdown` selector into one signature Praktoteka hero card (`rounded-2xl`, `BrandBlobSoftBlueIcon`, `BrandBlobLimeIcon`, `BrandScalesIcon` + `BrandLimeBurstIcon` tile, clean action buttons) matching `/workspace` and `/innovations`. Remove the extra „Tylko różnice” `Switch`/hidden-row badge, redundant clear buttons beside `Dropdown`s, table section-banner rows, `Wymagane zasoby` row, and mini progress bars in score cells. Keep the flat, rounded-2xl comparison matrix with area badges in column headers, `origin_location`, 40/20/20/20 match breakdown, `StatusIndicator`, and non-color `Najwyższy` score leader `Badge`.
- **Affected Docs & Tasks:** `docs/tasks/T06-compare-redesign.md`, `frontend/src/app/compare/page.tsx`, `frontend/src/lib/compare-helpers.ts`, `frontend/src/lib/compare-helpers.test.mjs`. No API, model, route, or shared primitive changes.

### `DEC-025` — Hide Unauthenticated Save CTA on `/compare`
- **Date:** 2026-11-22 02:49
- **Status:** Accepted
- **Context / New Info:** User explicitly asked to remove the „Zaloguj się, aby zapisać” button from `/compare`.
- **Decision:** Render the „Zapisz porównanie” action only when `auth.authenticated` is true, leaving CSV and PDF export actions for unauthenticated visitors (who still have login/register controls in the application header).
- **Affected Docs & Tasks:** `frontend/src/app/compare/page.tsx`, `docs/tasks/T06-compare-redesign.md`. No API, model, or shared primitive changes.

### `DEC-025` — Hide Unauthenticated Save CTA on `/compare`
- **Date:** 2026-11-22 02:49
- **Status:** Accepted
- **Context / New Info:** User explicitly asked to remove the „Zaloguj się, aby zapisać” button from `/compare`.
- **Decision:** Render the „Zapisz porównanie” action only when `auth.authenticated` is true, leaving CSV and PDF export actions for unauthenticated visitors (who still have login/register controls in the application header).
- **Affected Docs & Tasks:** `frontend/src/app/compare/page.tsx`, `docs/tasks/T06-compare-redesign.md`. No API, model, or shared primitive changes.

### `DEC-026` — Close Admin Work and Save Local Checkpoint
- **Date:** 2026-11-22 02:43
- **Status:** Accepted
- **Context / New Info:** User explicitly closed the admin topic and requested a commit: “dobra i chuj zamykamy temat admina commit”.
- **Decision:** Keep the delivered scope: advanced quality-review DataTable, admin-only sidebar/home links and Demo PCI redirect. Cancel the remaining unapproved T04 redesign proposal (compact filter tiles, drawer editor and source/implementation list changes); retain its design as historical context and do not re-present it as pending work. Mark T04 `CANCELLED` for that unimplemented remainder, without claiming its delivered subset was reverted. User authorized a local checkpoint, not a push. No detailed manual verification results were supplied, so do not mark T05 verified or claim browser checks. Stage only admin changes, the Demo PCI redirect hunks and associated documentation; exclude concurrent login-form, registration, search/detail and generated-file changes.
- **Affected Docs & Tasks:** `docs/01-brief.md`, `docs/05-plan.md`, T04, T05 closure note; delivered frontend files. Existing architecture/UI contracts remain valid.

### `DEC-027` — Real Source Channels and Local Record Counts
- **Date:** 2026-11-22 04:43
- **Status:** Accepted
- **Context / New Info:** User explicitly requested 10 records per channel, working sources instead of deliberately failing demo entries, and actual local counts on source cards.
- **Decision:** Follow-up T07 implements this concrete request. Keep CORDIS, RUJ UJ and Nauka w Polsce; replace the two fabricated error/stale entries with OpenAlex PL. All four returned 10 parsed records during a live adapter check. Set default/configured channel limits to 10 and CORDIS remote page size to 10. Track source-to-feed provenance and count distinct non-merged local innovations dynamically; never increment external demo totals. Preserve custom feeds and existing innovation data; seed no fabricated ingestion failures. Real failures remain visible. Source-card layout stays unchanged; its label becomes “Rekordy w bazie”. This user instruction authorizes the bounded UI copy/default changes and implementation. No commit or push requested. Existing tasks and approvals remain unchanged. Code freeze is still unspecified.
- **Affected Docs & Tasks:** docs/01-brief.md (REQ-01, REQ-12), docs/03-architecture.md, docs/05-plan.md, new T07; ingestion models/migrations, defaults, pipeline, serializers/views/tests, seed command and admin defaults/label. Shared UI tokens and primitives are unchanged.

### `DEC-028` — Production Uses Live Harvesting, Not Demo Seeds
- **Date:** 2026-11-22 04:56
- **Status:** Accepted
- **Context / New Info:** User explicitly wants server data to come from real scraping, without seeds. User also instructed that deadline questions must not block further work.
- **Decision:** T08 removes runtime offline snapshots, defaults to live HTTP ingestion, excludes demo fixture command/test files from Docker build context, and adds a production harvesting process using the existing backend image. Keep source configuration independent of seed data. Persist per-feed pagination state and periodically revisit the first page while backfilling; bound each batch to 10 candidates by default. PostgreSQL advisory locking prevents overlapping imports. Preserve source hashes/provenance, real errors and pending-review classification. Remove fabricated imported scores; unknown assessments stay empty. Hide existing synthetic innovations without deleting the database. Existing session/PCI roles protect operator scraping/configuration endpoints. The existing source controls are narrowed to real refresh and automatic-harvesting enable/disable; no new visual design or shared primitives. This concrete production-data requirement authorizes these changes. No deployment, database wipe, commit or push. Remaining app/demo fixture cleanup outside ingestion is documented, not silently claimed complete.
- **Affected Docs & Tasks:** T08, docs/01-brief.md REQ-01/REQ-12, docs/03-architecture.md, docs/05-plan.md, runtime/adapter/API tests, backend Docker context, Compose and .env.example. T07 remains awaiting user sign-off; its historical results are retained.

### `DEC-029` — Source-Grounded Innovation Quality Assessments
- **Date:** 2026-11-22 05:16
- **Status:** Accepted
- **Context / New Info:** Following the requirements audit, user explicitly requested adding innovativeness, application potential and credibility assessments. The audited local database had 28 public real records and no quality scores. The request defines the feature; the detailed rubric below still awaits workflow plan confirmation.
- **Decision:** Add follow-up T09 rather than changing T08 or reopening the verified comparison redesign. Reuse existing score locations and the evidence section; no frontend design/code changes are proposed. Assess novelty and applicability from cited source material through the existing optional Gemini extraction; calculate credibility using transparent deterministic criteria. Version and explain every result, preserve unknown dimensions and never replace missing evidence with fixed demo scores. Assess new imports and relevant updates, and provide idempotent backfill of stored real records. Percentage indices are separate from the 40/20/20/20 problem-match score and do not certify scientific novelty or implementation success. Preserve DEC-028's real-only data requirement. Code freeze remains unspecified; prior user instruction says deadline clarification must not block work. No commit, push or deployment. Implementation awaits the plan-confirmation stage required by the workflow.
- **Affected Docs & Tasks:** docs/01-brief.md REQ-06/REQ-12, docs/03-architecture.md, docs/05-plan.md, docs/PROJECT_KNOWLEDGE.md and new T09. docs/02-ui-system.md remains applicable without changes. Existing task statuses/approvals remain unchanged.
- **Implementation approval:** 2026-11-22 05:19 — user: „dobra lecimy”. T09 moves to `IN_PROGRESS`; implement via `hackathon-run-task`, keeping manual sign-off user-owned.

<!-- Template for new entries:
### `DEC-XXX` — `<Short Title>`
- **Date:** `<YYYY-MM-DD HH:MM from date '+%Y-%m-%d %H:%M'>`
- **Status:** Accepted | Superseded by DEC-YYY
- **Context / New Info:** `<What changed or what was decided>`
- **Decision:** `<Exact choice made>`
- **Affected Docs & Tasks:** `<e.g., docs/01-brief.md, docs/03-architecture.md, T03, T04>`
-->
