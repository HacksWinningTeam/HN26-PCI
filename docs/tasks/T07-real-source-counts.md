# `T07` — Real Ingestion Channels and Local Counts

- **Status:** `IN_PROGRESS`
- **Layer:** `Full-Stack`
- **UI Design Required:** `Yes`
- **Depends On:** None (existing ingestion)
- **Traces To:** REQ-01, REQ-12, DEC-027

## Goal & User Outcome

Refreshing sources fetches up to 10 candidates per channel from real public feeds. Source cards show the number of distinct local innovations attributable to each feed, without fabricated totals or deliberate source failures.

## Scope & Non-Goals

- Configure CORDIS, RUJ UJ, Nauka w Polsce RSS and OpenAlex PL; remove only the two known seeded placeholders. Preserve custom feeds and existing innovations.
- Track provenance, backfill existing imports and calculate local counts on reads. Keep genuine error handling and relevance filtering.
- No broader admin redesign, background jobs, secret/env/dependency changes, commit or push.

## UI Design (Per-Task)

- **Approved:** 2026-11-22 04:43 — user's explicit three-point implementation request approves these bounded changes.
- **Route(s):** `/admin`, source section.
- **Layout/Components:** existing cards and NumberInput unchanged; label `Rekordy w bazie`, default channel limit 10. Existing loading/error/success feedback remains.
- **API:** `source_feeds[].records_count` is a read-only distinct count of non-merged local innovations linked through source provenance. Run API default `max_records=10`; per-feed config sets 10 for default channels.
- **WCAG:** existing labels, focus, target sizes and live status announcements retained; no new controls or visual states.

## Technical Implementation Plan

- Backend: `apps/ingestion/{models,default_feeds,pipeline,serializers,views,tests}.py`, new migrations for provenance and existing-feed upgrade, `apps/innovations/management/commands/seed_demo.py`.
- Frontend: defaults and count label in `src/app/admin/page.tsx`.
- Tests: seeded configs, migration/backfill, API counts ignoring fabricated cache/client input, repeat refresh, filtered records, merged/deleted records, shared sources and real network failure isolation.

## Acceptance Criteria

- [x] Default and configured feed limit is 10; upstream CORDIS/OpenAlex request 10 candidates.
- [x] Four real channels parse records live; no intentional failed/stale channels or fabricated failure run from seed.
- [x] Existing database upgraded without reseeding innovation/demo account data or deleting custom feeds.
- [x] API/cards count distinct local non-merged innovations; repeat runs do not inflate counts.
- [ ] Automated checks recorded; user confirms manual checks.

## Verification Checklist

### Automated Checks

- [x] `make test`: 29 tests passed, including provenance/backfill, repeat import, merge/delete, read-only counts and genuine failure isolation. 21 existing WhiteNoise warnings about missing dev `/app/staticfiles/`; no failures.
- [x] `make lint`: Ruff, frontend TypeScript and ESLint passed.
- [x] `make schema-check`: OpenAPI validation passed with no schema warnings.
- [x] `make migrations-check`: no missing model migrations. Applied ingestion 0004 and 0005 to the running local PostgreSQL database.
- [x] Frontend `npm test`: 47/47 passed (existing Node module-type warnings).
- [x] `make build-prod`: both production Docker images built, including Next.js production build. Final rebuild after adapter default adjustment also passed.
- [x] Same-origin frontend proxy: `/api/health/` and `/api/admin/source-feeds/` returned 200. Returned counts matched direct distinct local database counts.
- [x] Full live CLI refresh completed: 23 new records (including 2 potential duplicates), 13 irrelevant candidates skipped, 0 source errors. Four channel counts at 2026-11-22 04:49: CORDIS 11, RUJ UJ 2, Nauka w Polsce 9, OpenAlex 7. Counts are cumulative and need not equal the per-run candidate limit.
- [x] `git diff --check` passed. Browser visual/manual sign-off remains pending.
- Live adapter check: all four candidate channels returned 10 parsed records (2026-11-22 04:40–04:43); no Gemini calls during this check.

### Manual Verification

1. Open `/admin`, sources: CORDIS, RUJ, Nauka w Polsce, OpenAlex appear; no deliberately failing NCN/homepage placeholder. Existing custom feeds remain.
2. Refresh in live mode: per-channel counts reflect only records stored locally (pending review included); filtered candidates are excluded. Repeat and confirm counts do not grow from unchanged records.
3. New-channel form defaults to 10. Compare each card with its source-linked distinct innovation count in the database.
4. Merge/delete a local record and reload: count follows actual remaining innovations. A genuine unreachable custom channel still reports its error independently.

### Sign-Off

- **Verified By:** — (awaiting user).
- **Notes / Follow-Ups:** Preserve uncommitted scraper/admin work present before this task. No commit or push.
