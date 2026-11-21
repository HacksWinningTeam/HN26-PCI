# 05 — Master Implementation Plan

> Vertical-slice development roadmap. Each task links to a dedicated verifiable spec in `docs/tasks/TXX-*.md`. `hackathon-plan` replaces the `<Example: ...>` rows below with real tasks and links.

> **Planning note (`DEC-004`):** the approved product flow now starts with public catalog/problem discovery, continues through explained matching and comparison, and introduces registration only for personalized implementation planning and progress tracking. PCI administrators verify source data and monitor implementation progress. This file still contains template tasks; `hackathon-plan` must replace them with real vertical slices after the kickoff brief is approved.

> **Contract note (`DEC-005`):** real tasks must keep area separate from location, use `TRL`, implement the area/character taxonomy, expose the explained 40/20/20/20 match breakdown, preserve the three nested information levels, generate maturity-aware five-phase plans, and provide detailed PCI oversight.

## Task Status Legend

Design-system addition (`DEC-007`): themed brand icons and three organic photo frames are maintained in `/design-system`; user approved the supplied visual reference and requested a local commit. Existing template task statuses are unchanged.

Status lives in each task file's `Status` field; this table mirrors it.

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

## Milestone 2 — Core Features

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |

## Milestone 3 — Demo Polish & End-to-End Readiness

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |
