# `T04` — Simplify PCI Admin Panel

- **Status:** `CANCELLED`
- **Layer:** `Frontend`
- **UI Design Required:** `Yes`
- **Depends On:** None — cleanup of existing screen and APIs
- **Traces To:** REQ-11, DEC-018, DEC-020, DEC-022, DEC-026

> **Closed 2026-11-22 02:43 (DEC-026):** User closed admin work and requested a local commit. Admin-only navigation and the advanced DataTable are delivered and retained. `CANCELLED` applies to the unimplemented broader redesign below, not to those delivered changes. The remaining design is historical, not pending approval or implementation. Automated checks passed as recorded; no detailed browser verification was reported.

## Goal & User Outcome

Operator PCI quickly finds a record requiring action, edits or verifies it, checks sources and inspects adoption progress in a compact, readable interface.

## Scope & Non-Goals

- **In Scope:** four existing admin sections, visual hierarchy, filter density, record editor placement, list presentation, concise copy, accessible responsive controls and feedback.
- **Out of Scope:** new operator capabilities, dashboards/charts, batch operations, API/model/auth changes, new shared primitives or dependencies, redesigning other screens.

## UI Design (Per-Task)

- **Approved:** —
- **Route(s):** `/admin`; current section selection remains local state.
- **Reference Sketch / Assets:** existing `frontend/src/app/admin/page.tsx` and `/design-system`; no files found in `docs/inputs/ui/`. No decorative illustrations or new assets needed.
- **Layout & Information Hierarchy:**
  ```text
  Sidebar                          Navbar
  Rekordy                          Rekordy | search
  Duplikaty (n)                    ----------------------------
  Źródła                           Wszystkie n · Do weryfikacji n
  Wdrożenia (n)                    Braki i sprzeczności n · Duplikaty n
                                   Nieaktualne n
                                   ----------------------------
                                   Nazwa / organizacja | Status | Uwagi | Data | Akcje
                                   record rows separated by rules
                                   [Edytuj] [Zatwierdź when relevant]
                                   title links to public innovation

  Edytuj → right drawer on desktop / shared mobile sheet
  Źródła → neutral source rows + [Odśwież źródła], then run history
  Wdrożenia → neutral rows + [Szczegóły] to reveal notes/comparison
  Duplikaty → duplicate → primary record + [Scal]
  ```
- **Hierarchy and copy:** replace five `StatFilterCard` tiles with one wrapping group of ordinary buttons with counts and `aria-pressed`. Keep existing filter meaning, default `all` and priority ordering; counts are totals for each category, result count reflects search. Rename the first navigation section to “Rekordy”. Keep search in the existing shell; label it for the active section. Use 14px body text where practical, quiet metadata and separators. Remove redundant descriptions, repeated section headings, colored container fills and nested card borders. Color conveys actual status/feedback only.
- **Admin-only navigation (DEC-020):** explicitly requested and approved separately by the user at 2026-11-22 02:36. Remove “Moje wdrożenia” from the admin sidebar on desktop/mobile; keep only the four operator sections. Admin logo/breadcrumb home links point to `/admin`. This bounded correction is implemented separately; approval of the remaining cleanup proposal is still pending.
- **Advanced quality table (DEC-022):** user explicitly corrected the component choice at 2026-11-22 02:40. Use `DataTable<AdminInnovationItem>` with innovation/origin, textual status, complete issues, verification date and existing actions. Enable sorting on innovation/status/date, text filters for innovation/origin and issues, status category options with Polish labels, pagination (10 rows initially), page-size and visible-column controls. Preserve `slug` identity and priority ordering when no user sort is active. Shell search remains the only search field; changing shell search/category resets page while preserving table filters/sort/columns. Whole-filter reset clears category/search/table state. Keep the existing recovery for empty input rows and use DataTable's clear-filters recovery for no column-filter matches. Use the named keyboard-focusable scroll region on narrow widths. No selection, bulk actions or detail drawer; row actions stay in their existing column. Loading/error/success, >=44px row actions and API contracts remain unchanged. Supersedes the DEC-021 `SimpleTable` replacement; remaining screen redesign still awaits approval.
- **Record list:** desktop semantic table with name/organization, status, short issue summary, verification date and actions. Name links to public card. Full missing/conflicting text remains available in the editor. Keep quick verification and existing edit fields. Use 44px action targets. Narrow screens use labeled stacked rows, preserving all fields/actions and avoiding a forced 780px page width. A single data source drives both presentations; hidden responsive variants must not create duplicate IDs.
- **Editor:** reuse `Drawer` for the current form, including title, origin, status, verification method, summary and explicit checkboxes resolving missing/conflicting information. Show complete current issues before their resolution controls. Save/cancel in a clear footer; Escape/close returns focus to the initiating edit button. Save errors stay in the drawer and retain entries; submitting disables duplicate save actions and announces progress. Closing cancels unsaved local edits as the existing cancel action does.
- **Duplicates:** plain rows showing both record titles and links, with one “Scal” action and a single section-level explanation of its effect. Preserve existing merge behavior; do not introduce additional approval dialogs.
- **Sources:** plain rows with name/category, textual status, record count, last synchronization and source link; method/error details remain readable. Place “Odśwież źródła” here instead of every section's navbar. Run history is a simple list below the sources. Do not label missing timestamps as a successful synchronization.
- **Implementations:** compact list rows with organization/user, innovation, plan variant, textual phase and completed/total count. One “Szczegóły” disclosure per row reveals contact/location, completed titles, comparison link, reported issues and notes. Keep the “Z uwagami” filter and simple total count. Notes alone must not be labeled as errors. Existing comparison context handoff remains available.
- **Components (Reused vs. New):** reuse `AppShellLayout`, `Sidebar`, `NavBar`, `SidebarUtilities`, `AppFooter`, `Button`, `IconButton`, `Badge`, `Banner`, `Drawer`, loading/error/empty states and existing input styling. Page-local sections may be extracted for readability; no new shared primitive.
- **Interactive States:**
  - **Loading:** concise loading text, `aria-busy` on results; disable unavailable mutation actions.
  - **Empty:** distinguish no data from no matching results; offer clear filters only when filters/search are active. Do not claim synchronization or verification occurred merely because a list is empty.
  - **Error:** existing full-page retry for initial fetch failure; inline operation error preserving data. Editor errors remain visible within its modal context.
  - **Success:** short polite live confirmation after verify/edit/merge/sync, then refreshed data. Pending state belongs to the relevant action; retain filters/search.
- **API Fields & Contracts Consumed:**
  - `GET /api/admin/innovations/`: `all_records`, `pending_review`, `conflicts_or_missing`, `potential_duplicates`, `stale_records`, `source_feeds`, `ingestion_runs`.
  - Record fields: `slug`, `title_pl`, `short_summary_pl`, `organization_name`, `origin_location`, `verification_status`, `verification_method`, `last_verified_at`, `missing_info`, `conflicting_info`, `duplicate_of_slug`.
  - `PATCH /api/admin/innovations/{slug}/`: existing title/summary/origin/status/method fields and optionally empty `missing_info`/`conflicting_info` arrays when explicitly resolved.
  - `POST /api/admin/innovations/{slug}/merge-duplicate/`: returns `merged_slug`, `target_slug`.
  - `POST /api/admin/ingestion/run/`: existing run result (`summary`, status/counts/time). Feed fields: name/category/url/method/status/error_message/records_count/last_synced_at.
  - `GET /api/admin/implementations/`: `plan_id`, user identity/email, organization name/type/location, innovation title/slug, comparison slugs, variant, current phase, completed/total step counts, completed titles, reported issues, step notes, updated time.
  - Existing `radar-api.ts` helpers and operator permission boundary remain in use; all requests are same-origin.
- **WCAG 2.2 AA:** existing semantic light baseline and themes, >=4.5:1 text / >=3:1 controls, visible focus, >=44px actions, labeled controls and table headers. Selected filters expose `aria-pressed`; disclosures expose `aria-expanded`/`aria-controls`. Drawer traps focus and restores it; errors are announced within the modal. Status has text as well as color. Check keyboard navigation, 320px width and 200% zoom.

## Technical Implementation Plan

- **Backend:** unchanged; no migrations, schemas or endpoint changes.
- **Frontend:** bounded refactor of `frontend/src/app/admin/page.tsx` using existing shared primitives. Preserve handlers, request payloads, filtering and source/implementation data.
- **Config / Env:** unchanged.

## Acceptance Criteria

- [ ] User approves this design before UI implementation.
- [x] Explicitly requested admin-only navigation correction implemented (DEC-020); remaining cleanup design still awaits approval.
- [x] Advanced quality-review `DataTable` implemented (DEC-022), retaining data/actions and exposing sorting, filters, pagination and column controls.
- [ ] Five statistic tiles are replaced by compact, wrapping filters with equivalent counts/behavior.
- [ ] All four operator sections retain their data and actions.
- [ ] Record editing does not push the result list down; validation/network failures preserve form values.
- [ ] Sources and implementations use neutral rows, with full implementation details available on demand.
- [ ] Synchronization action is scoped to Sources; statuses and empty-state copy reflect actual data.
- [ ] Keyboard/mobile/zoom checks pass and the user confirms manual verification.

## Verification Checklist

### Automated Checks

#### Separate admin navigation correction (DEC-020)

- Local `npm run typecheck`, `npm run lint`, `npm test` (43/43) and `npm run build -- --webpack` passed. Existing Node module-type warnings remain in the test suite. `git diff --check` passed.
- No new tests for removing a static menu entry. Browser review of desktop/mobile navigation remains pending.
- Docker checks omitted per the existing user restriction; no backend/schema/migration changes. These results cover the navigation correction, not the pending broader redesign below.

#### Separate shared-table replacement (DEC-021)

- Local `npm run typecheck` and `npm run lint` passed with zero errors/warnings. `npm test` passed 43/43 existing tests with the existing Node module-type warnings. Local `npm run build -- --webpack` and `git diff --check` passed.
- Existing shared `SimpleTable` now owns table markup; typed local column renderers retain complete record data and call the existing handlers. No new data-processing logic or shared component changes, so no additional unit tests added.
- Docker-based `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod` omitted per the documented user restriction. No backend/schema/migration changes. Browser interaction/visual verification remains pending.

#### Advanced DataTable replacement (DEC-022)

- Local `npm run typecheck`, `npm run lint`, `npm test` (43/43), `npm run build -- --webpack` and `git diff --check` passed. Existing Node module-type warnings remain in tests; lint/typecheck/build are clean.
- The existing DataTable model tests cover filter combination, sorting, pagination clamping and visibility normalization. Integration adds typed column configuration and controlled page reset; no new query engine or shared component changes. No extra unit tests added for static configuration.
- Docker-based `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod` omitted per the documented user restriction. No backend/schema/migration changes. Browser review remains pending; these checks do not claim visual/interaction verification.

#### Pending broader cleanup (DEC-018)

- [ ] Local frontend typecheck, lint and existing test suite; add meaningful logic tests only if logic changes.
- [ ] Local frontend production build and `git diff --check`.
- `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod`: record results or explicit limitations during implementation. Prior decisions exclude Docker at the user's request; no Docker checks or image-build success may be claimed from local frontend checks.

### Manual Verification

1. Sign in as an operator, open `/admin`, try all filters/search and public record links.
2. Edit/save/cancel a record; inspect complete issues, verify intentional issue resolution, refresh to confirm persistence. Check pending and failed save behavior.
3. Verify a record, inspect duplicate pair links and merge; confirm refreshed results and concise feedback.
4. Open Sources, inspect statuses/links/errors, run synchronization and inspect history/pending feedback.
5. Open Implementations, filter/search, expand details, open comparison and inspect notes/progress.
6. Check keyboard navigation, drawer Escape/focus return, 320px and 200% zoom; existing permissions and logout remain effective.
7. DEC-020: desktop/mobile admin sidebar contains only four operator sections, without “Moje wdrożenia”; logo and home breadcrumb target `/admin`.
8. DEC-022: in Quality/verification, check advanced table appearance, complete issues and verify/edit/public-card actions. Sort by title/status/date, filter status and text, navigate/change page size and hide/show columns. Change shell query/category from a later page: page resets while table preferences remain. Clear all filters, check unsorted priority ordering and both empty/no-results recovery. Check the named scroll region with keyboard at narrow widths.

### Sign-Off

- **Verified By:** —
- **Notes / Follow-Ups:** User closed admin work and authorized a checkpoint at 2026-11-22 02:43 (DEC-026). Admin-only navigation and the advanced quality table remain delivered. The unapproved broader redesign is cancelled. No browser verification is claimed.
