# 05 — Master Implementation Plan

> Vertical-slice development roadmap. Each task links to a dedicated verifiable spec in `docs/tasks/TXX-*.md`. `hackathon-plan` replaces the `<Example: ...>` rows below with real tasks and links.

> **Planning note (`DEC-004`):** the approved product flow now starts with public catalog/problem discovery, continues through explained matching and comparison, and introduces registration only for personalized implementation planning and progress tracking. PCI administrators verify source data and monitor implementation progress. This file still contains template tasks; `hackathon-plan` must replace them with real vertical slices after the kickoff brief is approved.

> **Contract note (`DEC-005`):** real tasks must keep area separate from location, use `TRL`, implement the area/character taxonomy, expose the explained 40/20/20/20 match breakdown, preserve the three nested information levels, generate maturity-aware five-phase plans, and provide detailed PCI oversight.

> **Discovery consolidation (`DEC-014`):** user approved merging the existing catalog and problem screen before further development. T03 tracks this bounded refactor independently of the still-placeholder T01/T02 rows.

> **Admin closure (`DEC-026`):** user closed the admin topic and authorized a local checkpoint of the delivered admin-only navigation, advanced quality table and Demo PCI redirect. The unimplemented broader T04 redesign is cancelled; delivered changes remain. No detailed browser verification results were supplied.

> **Admin table (`DEC-022`, supersedes `DEC-021`):** delivered advanced `DataTable` for quality review, with sorting, column filters, pagination and column visibility controls.

## Task Status Legend

Design-system addition (`DEC-007`): themed brand icons and three organic photo frames are maintained in `/design-system`; user approved the supplied visual reference and requested a local commit. Existing template task statuses are unchanged.

Design-system addition (`DEC-008`): `PublicNavBar` previews for landing/login/register live in Navigation bars alongside the application shell. Future product-screen tasks should use this header for public landing/account layouts. No task statuses changed.

Design-system refinement (`DEC-009`): mobile app shell uses a single row for menu/title/icon actions, hides breadcrumbs, and puts search inside the expanded sidebar; desktop retains navbar search. Sidebar collapse remains on desktop only; mobile always uses the full labeled menu (`DEC-010`). The gallery and its mobile preview share these rules; no task statuses changed.

Status lives in each task file's `Status` field; this table mirrors it.

Design-system refinement (`DEC-012`, `DEC-013`): sidebar stays left within a full-width shell; navbar and footer backgrounds/borders span the right column. Page content, footer contents, and navbar controls are centered with a 1600px cap and remain fluid on narrower screens. No task statuses changed; no active TXX spec exists yet.

- `TODO` — Planned; ready for design (if UI-facing) or implementation (if backend/infra only, once dependencies are `VERIFIED`).
- `DESIGN_REVIEW` — `## UI Design (Per-Task)` written (`hackathon-ui-design`) and **awaiting user approval**. Not ready for implementation.
- `DESIGN_READY` — UI design explicitly approved by the user (approval date recorded in the task); ready for implementation.
- `IN_PROGRESS` — Currently being implemented, or implemented and awaiting the user's manual verification.
- `VERIFIED` — Automated checks passed AND the user confirmed the manual verification steps.
- `CANCELLED` — Dropped via a `DEC-XXX` entry in `docs/04-decisions.md`.

## Milestone 1 — Core Vertical Slice (MVP Skeleton)

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |
| `T01` | `<Example: Core domain model + CRUD API>` | Backend | No | — | `TODO` | [T01](tasks/_template.md) |
| `T02` | `<Example: Primary user workflow screen>` | Full-Stack | Yes | `T01` | `TODO` | [T02](tasks/_template.md) |
| `T03` | Unified innovation discovery · horizontal filters (DEC-015) | Frontend | Yes | — (existing endpoints) | `IN_PROGRESS` | [T03](tasks/T03-unified-discovery.md) |
| `T04` | PCI admin cleanup · delivered subset retained; broader redesign cancelled (DEC-026) | Frontend | Yes | — (existing endpoints) | `CANCELLED` | [T04](tasks/T04-admin-cleanup.md) |
| `T05` | Demo PCI login opens admin (DEC-019) | Frontend | No | — | `IN_PROGRESS` | [T05](tasks/T05-demo-pci-redirect.md) |
| `T06` | Redesign innovation comparison screen (DEC-023) | Frontend | Yes | — (existing endpoints) | `VERIFIED` | [T06](tasks/T06-compare-redesign.md) |

## Milestone 2 — Core Features

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |

## Milestone 3 — Demo Polish & End-to-End Readiness

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |
