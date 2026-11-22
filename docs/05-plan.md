# 05 — Master Implementation Plan

> Vertical-slice development roadmap. Each real task links to its spec in `docs/tasks/TXX-*.md`. Task status is defined in that spec and mirrored here.

> **Existing foundations (`DEC-004`, `DEC-005`):** catalog/problem matching, account sessions, organization profiles and rule-based five-phase plans are implemented. The tasks below track subsequent slices and refinements; they are not a complete history of the initial implementation.

> **Contract note (`DEC-005`):** real tasks must keep area separate from location, use `TRL`, implement the area/character taxonomy, expose the explained 40/20/20/20 match breakdown, preserve the three nested information levels, generate maturity-aware five-phase plans, and provide detailed PCI oversight.

> **Task numbering (`DEC-036`):** T01/T02 were unused template examples, had no real specs and were removed from the active board. Keep those IDs reserved; do not recreate tasks or infer missing implementation from the numbering gap. This documentation cleanup does not change any real task status or approval.

> **Admin closure (`DEC-026`):** user closed the admin topic and authorized a local checkpoint of the delivered admin-only navigation, advanced quality table and Demo PCI redirect. The unimplemented broader T04 redesign is cancelled; delivered changes remain. No detailed browser verification results were supplied.

> **Admin table (`DEC-022`, supersedes `DEC-021`):** delivered advanced `DataTable` for quality review, with sorting, column filters, pagination and column visibility controls.

> **Mentor walkthrough:** [`USER_FLOW.md`](USER_FLOW.md) documents current navigation, public/account/PCI access boundaries and the organization-to-operator demo sequence. This is a documentation addition; task statuses, implementation scope and approvals remain unchanged.

## Task Status Legend

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
| `T03` | Unified innovation discovery · horizontal filters (DEC-015) | Frontend | Yes | — (existing endpoints) | `IN_PROGRESS` | [T03](tasks/T03-unified-discovery.md) |
| `T04` | PCI admin cleanup · delivered subset retained; broader redesign cancelled (DEC-026) | Frontend | Yes | — (existing endpoints) | `CANCELLED` | [T04](tasks/T04-admin-cleanup.md) |
| `T05` | Demo PCI login opens admin (DEC-019) | Frontend | No | — | `IN_PROGRESS` | [T05](tasks/T05-demo-pci-redirect.md) |
| `T06` | Redesign innovation comparison screen (DEC-023) | Frontend | Yes | — (existing endpoints) | `VERIFIED` | [T06](tasks/T06-compare-redesign.md) |
| `T07` | Real ingestion channels · limit 10 · local counts (DEC-027) | Full-Stack | Yes (bounded changes explicitly approved) | — | `IN_PROGRESS` | [T07](tasks/T07-real-source-counts.md) |
| `T08` | Production live harvesting (DEC-028) | Full-Stack / Infra | Yes (bounded controls authorized by request) | — (existing ingestion) | `IN_PROGRESS` | [T08](tasks/T08-production-harvesting.md) |

## Milestone 2 — Core Features

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |
| `T09` | Source-grounded innovativeness, application potential and credibility assessments (DEC-029) | Backend | No (existing score/evidence presentation) | — (existing ingestion/catalog) | `IN_PROGRESS` | [T09](tasks/T09-innovation-assessments.md) |
| `T10` | TRL/deployment provenance, honest Oslo 2018 assessment & full source refresh (DEC-030) | Full-Stack | Yes | — (existing ingestion, catalog & comparison) | `IN_PROGRESS` | [T10](tasks/T10-classification-oslo-refresh.md) |
| `T11` | CTT technology offers and school innovation sources (DEC-031) | Backend | No | — (existing ingestion/source cards) | `IN_PROGRESS` | [T11](tasks/T11-ctt-school-sources.md) |

## Milestone 3 — Demo Polish & End-to-End Readiness

| ID | Task | Layer | UI Design? | Depends On | Status | Spec |
| --- | --- | --- | --- | --- | --- | --- |
| `T12` | Impact Radar in PCI Panel & real deployment outcome loop (`DEC-033`) | Full-Stack | Yes | — (existing implementation plans & PCI panel) | `IN_PROGRESS` | [T12](tasks/T12-impact-radar.md) |
| `T13` | Feedback loop survey, real results attachment & transfer pair in PCI Admin (`DEC-034`) | Full-Stack | Yes (explicit user screenshot + request) | `T12` | `IN_PROGRESS` | [T13](tasks/T13-feedback-loop-attachment.md) |
