# `T03` — Unified Innovation Discovery

- **Status:** `IN_PROGRESS`
- **Layer:** `Frontend`
- **UI Design Required:** `Yes`
- **Depends On:** None — refactor of existing screens using existing endpoints
- **Traces To:** REQ-02, REQ-03, REQ-04, REQ-05, DEC-014, DEC-015

## Goal & User Outcome

Browse innovations and describe a problem in one „Szukaj innowacji” screen, retaining common filters, comparison and implementation context.

## Scope & Non-Goals

- **In Scope:** canonical `/innovations`, optional expanded problem context, shared constraints/results, grid/table, explanation, exports, notifications, source/adopter distinctions, navigation and legacy redirect.
- **Out of Scope:** new backend endpoints/models, infrastructure, changing matching weights, redesigning account/implementation screens.

## UI Design (Per-Task)

- **Approved:** 2026-11-22 02:22 — user explicitly approved DEC-015 design and implementation: “no to jazda”. Recorded `DESIGN_READY`, then started implementation (`IN_PROGRESS`).
- **Previous approval:** 2026-11-22 02:08 covered DEC-014 discovery consolidation; retained as history, replaced for the layout by DEC-015.
- **Route(s):** `/innovations`, `/innovations?mode=problem`; `/solve` redirects preserving parameters.
- **Reference Sketch / Assets:** user's screenshot from 2026-11-22 02:17; existing catalog components and visual system. Conversation mockup: `work/discovery-design/horizontal-filters.html` (illustrative subset of screenshot records; no production data calls).
- **Layout & Information Hierarchy:**
  ```text
  Sidebar: one “Szukaj innowacji” entry | NavBar (no duplicate search)
  One search/filter surface:
    Czego szukasz? [name / phrase........................] [Szukaj]
    [ ] Opisz problem dokładniej → optional problem/adopter context
    Obszar [v]   Branża [v]   Beneficjenci [v]   Etap wdrożenia [v]
    [Więcej filtrów (n) v]                     [Wyczyść filtry]
      inline advanced fields when expanded
    Active removable filter chips (only when selected)
  Match guidance / pending recalculation message (when applicable)
  Existing comparison tray (only when records selected)
  Result count                     Sort · grid/table · CSV/PDF
  Full available width: Cards or rows + expandable match explanation
  Empty/error recovery and email notification
  ```
- **Primary fields:** native selects for area, sector, deployment level; beneficiaries use the existing `Popover` with labeled native checkboxes (OR semantics), selected count and a clear/done action. No duplicate fields in optional problem mode.
- **Advanced filters:** a single inline disclosure contains character, minimum TRL, innovation origin, source organization and verified-only checkbox. Badge counts active advanced criteria even when collapsed; collapse never clears values. No side drawer or second filter sidebar.
- **Interaction:** catalog filters update immediately; problem matching keeps explicit submission and stale-score warning. “Wyczyść filtry” and chip removal reset structural filters only, preserving query, problem mode and adopter context. Explicit whole-search reset, if retained, must have a separate label. Removing sector/beneficiaries after a match also marks scores pending recalculation.
- **Responsive hierarchy:** four primary fields where space allows (roughly >=1000px available content width), then two, then one (<560px). Advanced fields use the same responsive grid. Results use available content width: three cards only when each fits at >=280px, otherwise two/one. Toolbar wraps into separate rows; no horizontal control scrolling at 320px or 200% zoom. A single mounted filter tree serves all widths. Keep existing shell and comparison tray behavior, no new sticky layer.
- **Visual treatment:** one quiet surface with existing semantic tokens, 16–24px padding, 12–16px gaps, visible labels, consistent >=44px inputs, subtle divider between query and criteria. Preserve existing appearance modes; use light as accessibility baseline. Avoid adding per-filter cards or oversized headings.
- **Card refinement approved 2026-11-22 02:25 (`DEC-016`):** when adjacent cards have different content heights, the description/metadata section absorbs extra height. Potential and action sections remain at their natural height and align at the bottom. User supplied a second screenshot and explicitly requested this small correction; no additional design gate.
- **Narrow card actions approved 2026-11-22 02:26 (`DEC-017`):** below 25rem of card width, all three footer actions stack at full width. At wider card sizes they use one row. A named card container query responds to actual card width and root text scaling instead of the viewport; no orphan share button.
- **Components:** reuse `AppShellLayout`, `NavBar`, `InnovationCardCompact`, `CompareTray`, `SimpleTable`, `NotifyMeBox`, `Popover`, existing selection/feedback/button primitives; local layout/disclosure in `app/innovations/page.tsx`; shared filtering/sorting in `lib/innovation-search.ts`. No new shared primitive.
- **States:** loading hides stale results and announces pending search; errors offer retry and preserve criteria; empty results offer filter reset/notification; success announces count politely; low-confidence matches keep guidance/notification; editing scoring context labels scores as belonging to the previous query until explicit resubmission. Advanced disclosure shows its active count in every state. Beneficiary popover closes with Escape/outside click and returns focus; mobile uses the existing dialog fallback.
- **API Fields & Contracts:** `GET /api/innovations/?q=...`; `POST /api/discovery/match/` consumes `problem_text`, `sector`, `beneficiary_groups`, `organization_type`, `deployment_location`, `problem_scale`, `preferred_maturity`. Uses existing match scores/reasons/guidance and `SessionProvider` context. Existing saved-innovation/plan/notification calls retained.
- **WCAG 2.2 AA:** >=4.5:1 text and >=3:1 controls against actual surfaces, existing visible focus, labels and fieldsets, >=44px actions including chip removal/reset; filter disclosure has `aria-expanded` and `aria-controls`; chip buttons name the removal action and criterion. Single responsive filter tree avoids duplicate IDs; native selects/checkboxes; logical tab order follows query → filters → results; polite count/guidance, `aria-busy` during loading. Check keyboard, 320px width, 200% zoom and existing appearance modes.

## Technical Implementation Plan

- **Backend:** unchanged.
- **Frontend:** consolidate in `app/innovations/page.tsx`, server redirect in `app/solve/page.tsx`, navigation/link updates, common pure selector and tests.
- **Config / Env:** unchanged.

## Acceptance Criteria

- [x] One product navigation entry and one canonical discovery screen.
- [x] Keyword/catalog browsing and explicit problem matching use the same result surface.
- [x] Shared filters, grid/table, exports, favorites, plans and comparison remain wired.
- [x] Scores show all four components/weights; context edits request recalculation.
- [x] Legacy problem URLs retain parameters and open problem mode.
- [x] Search and filters share a top panel; results occupy all available content width.
- [x] Primary/advanced criteria, count and chips implemented in one responsive filter tree; narrow-width visual review remains in manual checks.
- [x] Filter reset preserves query/problem/adopter context; scores request recalculation where appropriate.
- [x] User approves DEC-015 design.
- [ ] User confirms updated manual verification below, including DEC-016/DEC-017 card refinements.

## Verification Checklist

### Automated Checks

#### Current refinement (`DEC-015`–`DEC-017`)

- [x] Local `npm run typecheck` and `npm run lint`: passed, zero errors/warnings on the final logic/card-alignment revision. An earlier lint run briefly encountered warnings in the concurrently edited detail/implementation files; the later run was clean.
- [x] Local `npm test`: 43/43 tests passed, including three new matching-context regressions (cleared sector/beneficiaries, individual context changes, reordered equivalent beneficiary groups). Existing Node module-type warnings remain.
- [x] `git diff --check`: passed.
- [x] Final local `npm run build -- --webpack`: passed after narrow-card action stacking, including TypeScript, page generation and standalone tracing. Compiled CSS contains the card container queries and responsive filter/result breakpoints. Scoped ESLint for the four changed frontend files also passed. The first build attempt encountered `usersCount` errors in the concurrently edited detail screen; subsequent builds passed without edits to that file by this task.
- `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod`: not run because the user explicitly prohibited Docker. No backend/models/API/dependency/Compose changes in this refinement. Local frontend production build is not a Docker image check.
- Browser visual verification remains pending: the available computer inventory exposes no connected browser tabs, and Safari access was denied earlier. No browser permissions/settings were changed and no visual pass is claimed.

#### Previous consolidation (`DEC-014`, historical)

- [x] Local `npm run typecheck`, `npm run lint` (no errors/warnings), and `git diff --check` passed.
- [x] Local `npm test`: all 34 tests passed, including shared constraints, OR across beneficiaries, missing/minimum TRL, source/adopter distinctions, ranking/sorting, legacy query preservation and route labels. Node emits the existing module-type warnings; no test failures.
- [x] Local production frontend build: `npm run build -- --webpack` passed in an isolated `/tmp` copy, including TypeScript, page generation and standalone tracing. The original output was locked by another build. Dependencies were symlinked from the workspace; only the isolated config widened `outputFileTracingRoot` to `/` to include those dependencies. Repository config/dependencies were unchanged. This is not a Docker production image check.
- `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod`: not run because user explicitly prohibited Docker. Backend unchanged; local frontend checks substitute only for frontend verification.

### Manual Verification

1. Open `/innovations`: one sidebar entry, no duplicate navbar/mobile-menu search; search a phrase, reset, and filter by area, character, multiple beneficiaries, origin, TRL, source organization and verification.
2. Switch grid/table, sort, compare 2–3 records and export CSV/PDF. Existing saved/plan indicators remain available for an authenticated user.
3. Enable detailed problem description, enter a problem and adopter context, submit: the same result list shows real match percentages and expandable four-part explanations.
4. Edit context after submission: old scores are explicitly marked pending recalculation; resubmit. Try empty/low-confidence matches and notification entry; errors offer retry.
5. Visit `/solve?q=pomoc+seniorom`: redirected to `/innovations` with query preserved and problem context open. Check both landing entrances and a narrow viewport (one filter panel and accessible labels).
6. Open a matched innovation, comparison and implementation planning: entered context remains available.
7. Verify the new top panel at wide/medium/320px widths and 200% zoom: no filter sidebar, controls wrap, cards keep readable width. Expand/collapse advanced filters and retain selections/count/chips; remove a chip and clear filters while keeping query and adopter context. Test beneficiary multi-select, Escape/focus restoration and all primary/advanced filters using keyboard only.
8. Compare cards with different title/tag lengths: additional height stays in the description/metadata section, potential blocks align just above the aligned action footers, with no extra blank area below the meter.
9. Resize cards below/above 25rem and toggle comparison: all footer actions stack together at narrow widths and use a row when wide, with no isolated share button. Check at increased text size too.

### Sign-Off

- **Verified By:** — (awaiting user)
- **Notes / Follow-Ups:** 2026-11-22 02:28 — user accepted the result and requested a local checkpoint commit (“ok czas na commita”). Commit covers discovery/navigation, filters, card refinements, tests and documentation; unrelated concurrent detail/implementation changes are excluded. No push. Full manual checklist confirmation remains pending; status stays `IN_PROGRESS`. Browser automation did not verify the UI: Safari access was denied earlier ("Computer Use was not approved to use Safari"). No browser settings or permissions were changed.
