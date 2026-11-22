# 03 — System Architecture

> Living technical architecture for backend, API contract, frontend routes, and integrations. Domain contracts and MVP data models are specified in [`docs/PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md) (Sections 4–7). Updated by `hackathon-plan`, `hackathon-ui-design` (when UI requires new fields/endpoints), and `hackathon-update-plan`.

## High-Level Data Flow

```text
Browser (same-origin) -> Next.js 16 (src/proxy.ts / SSR via API_INTERNAL_URL) -> Django 5.2 + DRF -> PostgreSQL 18
```

## Backend Apps & Data Models (`backend/`)

- **`apps.core`**: Built-in `GET /api/health/` readiness check.
- **`apps.innovations`**: `Innovation`, `InnovationSource`, `Evidence`; separate `primary_area` (`technological`, `educational`, `administrative`), multi-value `innovation_character` (`product`, `process`, `organizational`, `social`), beneficiary/sector/location tags, deployment level, optional `trl`, verification status, and duplicate relationships.
- **`apps.discovery`**: persisted or ephemeral `ProblemQuery` with problem text, sector, beneficiary groups, deployment location, and organization type; ranked `InnovationMatch` stores `problem_score`, `sector_score`, `beneficiary_score`, `organization_fit_score`, normalized `overall_score`, and an evidence-based explanation. Weights are respectively 40%, 20%, 20%, and 20%.
- **`apps.accounts`**: registered Radar user plus `AdopterProfile` describing organization type, deployment location, scale/user count, current approach, available resources, competencies, target date, and constraints. Innovation creators do not need accounts.
- **`apps.implementation`**: `ImplementationPlan` with `variant` (`validation`, `pilot`, `transfer_deployment`), five ordered `ImplementationStep` records (fit confirmation, contact/materials, readiness, pilot/execution, evaluation/scaling), requirements, risks, success metrics, progress state, relevant contact data, and saved comparisons. Rules select variant/facts; optional AI personalizes wording only.
- **`apps.ingestion`**: source configuration, ingestion runs, import errors, proposed changes, duplicate candidates, and verification audit history.

## API Endpoints Overview (`drf-spectacular`)

| Method & Path | View / App | Purpose | Auth / Permissions | Task |
| --- | --- | --- | --- | --- |
| `GET /api/health/` | `HealthCheckView` (`apps.core`) | DB + service readiness | Public | Starter |
| `GET /api/schema/`, `/api/docs/`, `/api/redoc/` | `drf-spectacular` | OpenAPI 3 spec & docs UI | Public | Starter |
| `GET /api/innovations/` | `apps.innovations` | Search, filter, sort, grid/table data | Public | TBD |
| `GET /api/innovations/{id}/` | `apps.innovations` | Detailed card, evidence and sources | Public | TBD |
| `POST /api/discovery/match/` | `apps.discovery` | Refine a problem and return explained matches | Public | TBD |
| `POST /api/notifications/matches/` | `apps.discovery` | Save an email for future matches; use account email when authenticated | Public / Registered | TBD |
| `POST /api/comparisons/` | `apps.discovery` | Save a 2–3 innovation comparison | Registered | TBD |
| `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/logout/` | `apps.accounts` | Same-origin account session | Public / Registered | TBD |
| `GET/PATCH /api/profile/` | `apps.accounts` | Implementation-context questionnaire | Registered | TBD |
| `POST /api/implementation-plans/` | `apps.implementation` | Generate a personalized five-step plan | Registered | TBD |
| `GET /api/implementation-plans/`, `PATCH /api/implementation-steps/{id}/` | `apps.implementation` | View plans and update checklist progress | Registered | TBD |
| `GET/PATCH /api/admin/innovations/` | `apps.ingestion` | Verify records and resolve quality issues | PCI Admin | TBD |
| `GET /api/admin/implementations/` | `apps.implementation` | PCI overview of adoption progress | PCI Admin | TBD |

## Frontend Routes & Modules (`frontend/`)

| Route | Component / Type | Purpose | API Endpoints Used | Task |
| --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx` (SSR `force-dynamic`) | Starter connectivity check | `GET /api/health/` | Starter |
| `/innovations` | Unified innovation discovery | Keyword/catalog search, optional problem context, shared filters, grid/table and match explanations | `GET /api/innovations/`, `POST /api/discovery/match/` | T03 / DEC-014 |
| `/innovations/[id]` | Innovation detail | Public level-2 detail with evidence/sources and registered level-3 “Odkryj” plan/contact CTA | `GET /api/innovations/{id}/` | TBD |
| `/solve` | Server redirect | Legacy entry to `/innovations?mode=problem`; preserves query parameters | None | T03 / DEC-014 |
| `/compare` | Comparison | Compare 2–3 innovations and match evidence | Innovation + comparison APIs | TBD |
| `/register`, `/login` | Account access | Account boundary for personalized features | Auth APIs | TBD |
| `/workspace` | Registered dashboard | Saved comparisons, implementation plans and progress | Profile + implementation APIs | TBD |
| `/workspace/plans/[id]` | Plan workspace | Five-step plan and progress checklist | Implementation APIs | TBD |
| `/admin` | PCI operations | Record verification and adoption oversight | Admin APIs | TBD |
| `/design-system` | `src/app/design-system/page.tsx` | Design system tokens, foundations, and planned UI slots | None | `DEC-003` |
| `/settings/accessibility` | `src/app/settings/accessibility/page.tsx` | WCAG 2.2 AA appearance, text scale, link underline, and read-aloud settings | None | `DEC-002` |

### Unified discovery behavior (`DEC-014`)

- Keyword submission uses the existing catalog endpoint; problem matching runs explicitly against the existing discovery endpoint. No API/model changes.
- Shared client-side constraints filter the returned complete lists in either mode. Multiple selected beneficiary groups use OR; categories combine with AND. Source organization type remains separate from the adopter organization used for matching.
- Structural filtering/sorting does not create new problem-query records. Changing the matching context marks the old scores as pending recalculation until explicit submission.
- Match requests cancel stale UI updates on cleanup. Context and match scores continue through `SessionProvider` to comparison and implementation planning.

## Environment Variables & External Integrations

- Document every new variable in `.env.example`, `compose.yaml`, and `compose.prod.yaml`.
- `<External APIs, keys, timeouts, fallback behavior>`

## Hackathon Simplifications & Tradeoffs

- Use a curated, source-linked dataset plus a demonstrable ingestion run rather than attempting to crawl every source during the live demo.
- Treat percentage match as an explainable weighted similarity score (40/20/20/20), never as a probability of implementation success.
- Generate one of three maturity-aware plan variants from deterministic templates and verified innovation/profile fields; optional AI may personalize wording but must not invent evidence, contacts, or achieved outcomes.
- Put source-backed or PCI-verified contact information required to execute the plan in the registered level-3 view.
- PCI administrators have detailed visibility into saved comparisons, generated plans, and per-step progress.
