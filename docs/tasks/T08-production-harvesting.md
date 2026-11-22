# `T08` — Production Live Harvesting Without Runtime Seeds

- **Status:** `IN_PROGRESS`
- **Layer:** `Full-Stack / Infra`
- **UI Design Required:** `Yes`
- **Depends On:** None (existing ingestion implementation)
- **Traces To:** REQ-01, REQ-12, DEC-028

## Goal & User Outcome

The deployed server grows its catalog by fetching actual public sources periodically. A fresh database starts with source configuration and zero invented innovations/accounts; test fixtures cannot run from the production image.

## Scope & Non-Goals

- Live HTTP ingestion only; no `sample_items` runtime fallback. Keep mocked HTTP and synthetic fixtures in tests.
- Separate scheduled harvesting process using the backend image; no new broker/dependencies. PostgreSQL lock shared with manual ingestion. Persist pagination and retry errors without losing progress.
- Paginate CORDIS/OpenAlex and OAI-PMH; revisit the head periodically. RSS refreshes current feed content. Source limits stay 10 per batch.
- Empty/failed API responses must not become fabricated innovation records. Do not assign identical invented scores to imported records.
- Preserve existing real records; hide existing synthetic entries without database reset. Do not deploy, push or commit.
- Existing PCI session roles authorize operator endpoints; no new auth system.

## UI Design (Per-Task)

- **Approved:** User explicitly requests real production scraping and no seeds. This bounded removal of offline behavior is directly implied by that request.
- **Route(s):** `/admin`, source section.
- **Layout:** Existing cards/buttons/forms remain. Remove global offline/live toggle; refresh always means HTTP. Existing per-channel toggle controls automatic fetching and is labeled accordingly. No new controls, tokens or shared primitives.
- **States/Accessibility:** Existing loading/error/refresh feedback and control semantics remain. Busy importer returns a clear conflict response. Real source errors stay visible.

## Technical Implementation Plan

- Backend ingestion adapters, pipeline, lock, worker/CLI commands, serializers/views/models/migrations and tests; existing PCI role permissions. `apps/discovery/comparison.py` omits score leaders when assessments are absent; missing export scores stay unknown. The discovered `DATABASE_URL` startup bug is fixed in `config/settings.py`.
- Backend `.dockerignore` excludes demo command and tests from image build context; Compose adds worker with no host ports and migrations disabled in worker.
- `INGESTION_INTERVAL_SECONDS` defaults to 3600; document in `.env.example` and mirror both Compose files. Local worker uses opt-in Compose profile to avoid uncontrolled API consumption during development.
- Remove static import score dictionary; absent values use existing missing-data UI. Preserve facts versus AI/rule classification.

## Acceptance Criteria

- [x] Fresh production image has no `seed_demo` command; deploy startup runs only migrations and real worker.
- [x] Automatic worker and manual refresh use real adapters and a shared lock; offline request is rejected.
- [x] Pagination survives restart, uses all OAI records before following tokens, and revisits source heads.
- [x] Failures/empty pages do not produce invented records or destroy saved progress.
- [x] Production operator routes require existing PCI authorization.
- [x] Existing synthetic records are hidden without deleting records/accounts or volumes.
- [ ] All required checks recorded; manual production sign-off remains user-owned.

## Verification Checklist

### Automated Checks

- [x] `make test`: 39 passed. Includes live-batch paging/head refresh, OAI page offsets/exclusive tokens, empty/error rejection, persisted state and network retry, cross-connection PostgreSQL lock, operator authorization, offline/config validation and worker CLI. Existing tests that assumed public admin access now authenticate an operator. 22 existing dev WhiteNoise warnings (`/app/staticfiles/` missing), no failures.
- [x] `make lint`: Ruff, frontend TypeScript and ESLint passed. Frontend `npm test`: 47/47 passed.
- [x] `make schema-check` and `make migrations-check` passed. Applied ingestion 0006/0007 locally; existing data preserved and synthetic innovations hidden.
- [x] `docker compose config --quiet` and production config with a placeholder secret passed. Production worker inherits backend environment/build, publishes no ports, waits for backend health and does not run migrations. Dev worker is opt-in (`--profile ingestion`).
- [x] Final `make build-prod` passed for backend/frontend. Fresh image startup against a disposable SQLite database in RAM passed all migrations; no `seed_demo` command/test modules, 0 innovations, 0 users and 4 live channel configurations. This exposed and fixed an existing unsupported `env.db(..., conn_max_age=60)` call; connection age is now set on the returned database configuration.
- [x] Actual local `run_ingestion_worker --once`: completed run #12 with 0 source errors, 0 duplicate reimports, 12 irrelevant candidates skipped. Persisted next-page state, no offline snapshots. Existing accepted hashes were reused.
- [x] `git diff --check` passed. No production server access, commit or push. User browser/production sign-off remains pending.

### Manual Verification

1. After the user deploys, confirm worker logs real refreshes and the catalog contains source-linked records, not fixture entries.
2. Restart worker: pagination continues; revisit source head; reimport unchanged data without extra records or Gemini calls.
3. Anonymous/ordinary users cannot run scraping or edit source configuration; PCI session can. A concurrent refresh reports busy.
4. Observe genuine source error/recovery and cumulative local counts. Fresh startup never creates demo accounts or synthetic innovations.

### Sign-Off

- **Verified By:** — (awaiting user).
- **Notes / Follow-Ups:** Production server not accessed. Preserve prior uncommitted work and deleted `docs/backend-game-plan.md`. No deadline clarification gate per user instruction.

## Checkpoint Scope

User requested closing the long uncommitted work interval. Proposed local checkpoint includes the earlier source CRUD/relevance changes, T07 and T08 production ingestion, verification/docs and the requested deletion of `docs/backend-game-plan.md`. Exclude generated `frontend/tsconfig.tsbuildinfo`, `.env` and secrets. User authorized the local checkpoint (“tak zapisz”); task remains `IN_PROGRESS` pending manual sign-off.
