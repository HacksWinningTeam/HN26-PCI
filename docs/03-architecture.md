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
- **`apps.implementation`**: `ImplementationPlan` with `variant` (`validation`, `pilot`, `transfer_deployment`), five ordered `ImplementationStep` records (fit confirmation, contact/materials, readiness, pilot/execution, evaluation/scaling), requirements, risks, success metrics, progress state, relevant contact data, saved comparisons, plus real transfer telemetry (`pilot_started_at`, `adopter_deployment_status`, `deployment_started_on`, `reached_beneficiaries_count`, `outcome_summary`, `evidence_url`, `deployment_reported_at`) and PCI transfer verification (`pci_transfer_status`, `pci_transfer_note`, `pci_transfer_verified_at`, `pci_transfer_verified_by`) (`DEC-033`, `T12`). Rules select variant/facts; optional AI personalizes wording only.
- **`apps.ingestion`**: source configuration, ingestion runs, import errors, proposed changes, duplicate candidates, and verification audit history. T07 / DEC-027 adds `SourceFeed.sources` provenance (many-to-many to `InnovationSource`, allowing overlapping channels). `records_count` in source API responses is read-only and counts distinct non-merged local innovations, including pending review; multiple citations and repeated imports do not inflate it. Counts update after merging/deleting records. Default channels: CORDIS, RUJ UJ, Nauka w Polsce RSS and OpenAlex PL; limit 10 candidates before relevance filtering, without invented failures or totals. Data migration upgrades existing default feeds and links previously imported sources; custom feeds/innovations are preserved.

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
| `GET/POST/DELETE /api/implementation-plans/{id}/attachment/` | `apps.implementation` | Upload/download/delete real deployment results file stored in PostgreSQL | Registered (owner) / PCI Admin (GET) | `T13` |
| `GET/PATCH /api/admin/innovations/` | `apps.ingestion` | Verify records and resolve quality issues | PCI Admin | TBD |
| `GET /api/admin/implementations/` | `apps.implementation` | PCI overview of adoption progress | PCI Admin | TBD |
| `GET /api/admin/impact-radar/` | `apps.implementation` | Live 4-stage transfer funnel KPIs and active transfer pipeline (zero mock data) | PCI Admin | `T12` |
| `POST /api/admin/implementations/{id}/verify-transfer/` | `apps.implementation` | Confirm deployment, verify measured effect, or request clarification from adopter | PCI Admin | `T12` |

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

### Production harvesting (`DEC-028`, T08)

- Deploy starts the web backend (migrations only) and a separate `ingestion` process using the same production build, without published ports. Worker polls on startup and then every `INGESTION_INTERVAL_SECONDS` (default 3600, minimum 60). Dev worker is opt-in via `docker compose --profile ingestion up -d ingestion`.
- Runtime ingestion always fetches HTTP; `sample_items` configurations and explicit offline run requests are rejected. Per-feed `config.live_fetch` enables automatic polling; manual refresh of a selected feed is always live. Real failures remain visible and are retried. Operator endpoints use existing session auth, CSRF and PCI permissions.
- `SourceFeed.harvest_state` persists page/offset/token information after successful processing. CORDIS uses page numbers; OpenAlex uses basic paging (first 10,000 results, no new API key needed); OAI consumes all records in a response before following its opaque resumption token. Every five backfill batches revisit the source head without losing backfill position. Network failure retains the saved position; expired OAI tokens restart through the normal endpoint.
- A PostgreSQL session advisory lock prevents overlap between scheduled imports, manual feed refresh and single-URL imports. Worker handles shutdown signals and retries failures on its next interval.
- Production Docker context excludes `seed_demo` and tests. Fresh migrations create six source configurations, zero innovations and zero accounts. Existing synthetic records become non-public; user/real-record data is not deleted. Create a real operator via `docker compose -f compose.prod.yaml exec backend python manage.py createsuperuser`.
- Imported innovations remain `pending_review`; unknown quality scores are empty rather than identical constants. Gemini enriches real source text with rule-based fallback, and provenance distinguishes AI/rules from source statements. This is harvesting from configured APIs/feeds/documents, not an unrestricted web crawler. Metadata and inferred fields still require operator review.
- Paging references: [OpenAlex official paging](https://help.openalex.org/api/paging/), [OAI-PMH flow control](https://www.openarchives.org/OAI/openarchivesprotocol.html#FlowControl).

## Additional Source Coverage (`DEC-031`, T11)

- CTT UŁ technology offers for business and IBE pedagogical innovation PDFs extend the original four science/R&D feeds. Existing `SourceFeed`/operator APIs and cards need no contract or layout changes.
- `HTML katalog` routes through `catalogues.py`, allowing only known document paths on the selected publisher host. Fetch up to 10 individual descriptions; never turn an index/navigation page into an innovation. CTT follows listing pages/offsets; IBE traverses its current innovation-PDF list. Both periodically revisit the head while retaining backfill position.
- CTT text uses scoped headline/teaser/article sections and explicit source TRL (Arabic/Roman). IBE reads PDF text, titles from the catalogue and school names from the form. IBE's Warsaw address is not treated as the school's location. Source-supplied metadata still requires PCI review; no invented quality scores.
- Migration ingestion `0008` only adds missing configurations by URL, preserves existing/custom feeds and performs no network requests or innovation seeding. Real import errors retain the previous cursor. Other audit findings, including protection of PCI facts during updates, remain outside T11.

## Quality Assessments (`DEC-029`, T09 — implemented, manual sign-off pending)

- Preserve `Innovation.scores` as the numeric, backwards-compatible projection with keys `innovativeness`, `application_potential`, `credibility`. Values are preliminary indices from 0 to 100, not success probabilities. Unknown dimensions omit their score key; zero means a supported low assessment. No new transferability score is inferred from the requested dimensions.
- `Innovation.assessment` stores rubric version, assessment/input/source hashes, timestamp, per-dimension criterion grades, reasons, source references/excerpts, limitations and method (`ai_estimate` / `system_calculation`). Explicit nested DRF serializers expose it on existing catalog/detail/comparison APIs; no new endpoint or environment variable. Migration innovations 0003 also gives generated `Evidence` a unique per-innovation `assessment_key`, preventing duplicate explanations while retaining source/PCI evidence.
- Use the existing optional Gemini extraction request to assess source-supported novelty and applicability using the bounded rubric in T09. Validate grade ranges and source references/excerpts before accepting a dimension. Missing/invalid AI output leaves that dimension unknown; no invented substitute. Credibility is calculated deterministically from traceable source material, linked evidence, verification, freshness and conflicts. AI output cannot verify itself.
- Generate replaceable, identified `Evidence` explanations so the current detail screen can show the methodology, reasons and limitations without frontend changes. Keep all source declarations and PCI facts. Existing score locations in cards/comparison display the numeric projection. Include assessments in backend exports; comparison must support these three dimensions without requiring a fourth score.
- Assess new imports, changed source inputs and quality-affecting PCI edits/merges. Reuse unchanged input/version results to avoid duplicate evidence and Gemini requests. The `assess_innovations --limit 1..100 [--slug ...] [--dry-run] [--retry-unknown] [--workers 1..4]` command backfills stored real source snapshots under the ingestion lock. Dry-run never writes/calls AI; no fixtures, network calls during migrations or AI on public GET requests. Retry preserves already completed dimensions for unchanged sources/version.
- T09 is scoped to these assessments. `DEC-030` / `T10` addresses classification provenance visibility on `TRL` and `deployment_level`, stopping rule-based TRL inference from deployment mentions, genuine two-criterion Oslo Manual 2018 compliance evaluation, and full re-classification/lifecycle progression on source updates. New source channels, notification delivery and unrelated plan/contact gaps remain separate audit findings. Global UI contracts in `02-ui-system.md` are unchanged.

## Hackathon Simplifications & Tradeoffs

- Production data comes from real configured public sources and periodic harvesting. Synthetic fixtures exist only for local tests; production contains no demo-seed command.
- Treat percentage match as an explainable weighted similarity score (40/20/20/20), never as a probability of implementation success.
- Generate one of three maturity-aware plan variants from deterministic templates and verified innovation/profile fields; optional AI may personalize wording but must not invent evidence, contacts, or achieved outcomes.
- Put source-backed or PCI-verified contact information required to execute the plan in the registered level-3 view.
- PCI administrators have detailed visibility into saved comparisons, generated plans, and per-step progress.
