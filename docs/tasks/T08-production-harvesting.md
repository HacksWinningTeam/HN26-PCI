# `T08` — Production Live Harvesting

- **Status:** `IN_PROGRESS`
- **Layer:** `Full-Stack / Infra`
- **UI Design Required:** `Yes`
- **Depends On:** None (existing ingestion implementation)
- **Traces To:** REQ-01, REQ-12, DEC-028

## Goal & User Outcome

The deployed server grows its catalog by fetching actual public sources periodically. Startup configures sources and the scheduled worker. Account provisioning is controlled by `BOOTSTRAP_DEMO_ACCOUNTS` (`DEC-032`).

## Scope & Non-Goals

- Live HTTP ingestion through configured source adapters.
- Separate scheduled harvesting process using the backend image; no new broker/dependencies. PostgreSQL lock shared with manual ingestion. Persist pagination and retry errors without losing progress.
- Paginate CORDIS/OpenAlex and OAI-PMH; revisit the head periodically. RSS refreshes current feed content. Source limits stay 10 per batch.
- Record source failures and validate imported assessments.
- Preserve existing records and import history. Do not deploy, push or commit.
- Existing PCI session roles authorize operator endpoints; no new auth system.

## UI Design (Per-Task)

- **Approved:** User explicitly requested production source harvesting and periodic refreshes.
- **Route(s):** `/admin`, source section.
- **Layout:** Existing cards/buttons/forms remain. Remove global offline/live toggle; refresh always means HTTP. Existing per-channel toggle controls automatic fetching and is labeled accordingly. No new controls, tokens or shared primitives.
- **States/Accessibility:** Existing loading/error/refresh feedback and control semantics remain. Busy importer returns a clear conflict response. Real source errors stay visible.

## Technical Implementation Plan

- Backend ingestion adapters, pipeline, lock, worker/CLI commands, serializers/views/models/migrations and tests; existing PCI role permissions. `apps/discovery/comparison.py` omits score leaders when assessments are absent; missing export scores stay unknown. The discovered `DATABASE_URL` startup bug is fixed in `config/settings.py`.
- Backend `.dockerignore` excludes tests from image build context; Compose adds worker with no host ports and migrations disabled in worker.
- `INGESTION_INTERVAL_SECONDS` defaults to 3600; document in `.env.example` and mirror both Compose files. Local worker uses opt-in Compose profile to avoid uncontrolled API consumption during development.
- Remove static import score dictionary; absent values use existing missing-data UI. Preserve facts versus AI/rule classification.

## Acceptance Criteria

- [x] Startup runs migrations, optional account provisioning and the ingestion worker.
- [x] Automatic worker and manual refresh use real adapters and a shared lock; offline request is rejected.
- [x] Pagination survives restart, uses all OAI records before following tokens, and revisits source heads.
- [x] Import failures preserve saved progress.
- [x] Production operator routes require existing PCI authorization.
- [x] Existing records, accounts and volumes are preserved.
- [ ] All required checks recorded; manual production sign-off remains user-owned.

## Verification Checklist

### Automated Checks

- [x] `make test`: 39 passed. Includes live-batch paging/head refresh, OAI page offsets/exclusive tokens, empty/error rejection, persisted state and network retry, cross-connection PostgreSQL lock, operator authorization, offline/config validation and worker CLI. Existing tests that assumed public admin access now authenticate an operator. 22 existing dev WhiteNoise warnings (`/app/staticfiles/` missing), no failures.
- [x] `make lint`: Ruff, frontend TypeScript and ESLint passed. Frontend `npm test`: 47/47 passed.
- [x] `make schema-check` and `make migrations-check` passed. Applied ingestion 0006/0007 locally; existing data preserved.
- [x] `docker compose config --quiet` and production config with a placeholder secret passed. Production worker inherits backend environment/build, publishes no ports, waits for backend health and does not run migrations. Dev worker is opt-in (`--profile ingestion`).
- [x] Final `make build-prod` passed for backend/frontend. Fresh image startup against a disposable SQLite database in RAM passed all migrations; all migrations and four live channel configurations. This exposed and fixed an existing unsupported `env.db(..., conn_max_age=60)` call; connection age is now set on the returned database configuration.
- [x] Actual local `run_ingestion_worker --once`: completed run #12 with 0 source errors, 0 duplicate reimports, 12 irrelevant candidates skipped. Persisted next-page state, no offline snapshots. Existing accepted hashes were reused.
- [x] `git diff --check` passed. No production server access, commit or push. User browser/production sign-off remains pending.

### Manual Verification

1. After the user deploys, confirm worker logs real refreshes and the catalog contains source-linked records, not fixture entries.
2. Restart worker: pagination continues; revisit source head; reimport unchanged data without extra records or Gemini calls.
3. Anonymous/ordinary users cannot run scraping or edit source configuration; PCI session can. A concurrent refresh reports busy.
4. Observe genuine source error/recovery and cumulative local counts. Startup provisions accounts according to `BOOTSTRAP_DEMO_ACCOUNTS` and configures source harvesting.

### Sign-Off

- **Verified By:** — (awaiting user).
- **Notes / Follow-Ups:** Production server not accessed. Preserve prior uncommitted work and deleted `docs/backend-game-plan.md`. No deadline clarification gate per user instruction.

## Checkpoint Scope

User requested closing the long uncommitted work interval. Proposed local checkpoint includes the earlier source CRUD/relevance changes, T07 and T08 production ingestion, verification/docs and the requested deletion of `docs/backend-game-plan.md`. Exclude generated `frontend/tsconfig.tsbuildinfo`, `.env` and secrets. User authorized the local checkpoint (“tak zapisz”); task remains `IN_PROGRESS` pending manual sign-off.
