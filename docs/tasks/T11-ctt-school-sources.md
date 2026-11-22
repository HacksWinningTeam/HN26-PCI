# `T11` — CTT Technology Offers and School Innovation Sources

- **Status:** `IN_PROGRESS`
- **Layer:** `Backend`
- **UI Design Required:** `No`
- **Depends On:** None (uses existing ingestion and source cards)
- **Traces To:** REQ-01, REQ-12, DEC-031

## Goal & User Outcome

Automatically discover technology offers for business from CTT Uniwersytetu Łódzkiego and implemented school innovations published by IBE, broadening the existing science/R&D channels into the other two FAQ source groups.

## Scope & Non-Goals

- Add two enabled default catalogue channels and a configuration-only data migration.
- Parse individual CTT HTML cards and IBE pedagogical-innovation PDFs; exclude navigation, unrelated project PDFs and catalogue pages.
- Persist bounded offsets/pagination with head revisits; fail visibly on empty/unrecognized catalogues or inaccessible documents without advancing saved state.
- Preserve source URLs, snapshots, explicit TRL metadata and publisher-derived classification. Do not attribute IBE's address to the implementing school.
- Reuse ingestion quality assessment, deduplication, pending review, source counters and periodic worker.
- No frontend layout/API/env changes; no fixes to unrelated audit findings or synthetic data.

## UI Design (Per-Task)

N/A — backend source additions displayed by existing source cards.

## Technical Implementation Plan

- `apps/ingestion/catalogues.py`: allowlisted catalogue link discovery and detail parsing.
- `apps/ingestion/adapters.py`: route `HTML katalog` batches to the catalogue adapter.
- `apps/ingestion/default_feeds.py` and migration `0008`: register two real channels without resetting existing sources/settings.
- `apps/ingestion/test_catalogues.py`: discovery, pagination/head revisits, PDF/HTML metadata, failure behavior, idempotent configuration and API/import persistence.
- Document coverage and limitations in DATA_SOURCES.md and project memory.

## Acceptance Criteria

- [x] Both channels appear in the existing source API with real local record counts.
- [x] A live refresh imports individual source-backed CTT and school records, at most 10 per channel.
- [x] Repeated batches preserve pagination and do not duplicate already imported URLs.
- [x] Explicit source values remain distinct from AI/rule estimates; unknown quality remains unknown.
- [x] Existing/custom feeds are preserved; migrations perform no network access or innovation seeding.

## Verification Checklist

### Automated Checks
- [x] `make test`: 72 passed, including 6 new catalogue tests. 26 existing-environment warnings about absent dev `/app/staticfiles/`; no test failures.
- [x] `make lint`: Ruff, TypeScript and ESLint passed.
- [x] `make schema-check`: validated with `--fail-on-warn`, exit 0.
- [x] `make migrations-check`: no changes detected; migrations ingestion 0008 and previously pending innovations 0004 applied successfully.
- [x] `make build-prod`: backend and frontend production images built successfully.
- [x] Live import and repeat refresh: 2026-11-22 06:16, IngestionRun #15 imported 20 real records (10 CTT, 10 IBE), zero errors/conflicts/duplicates. Both cursors at offset 10. Re-fetching the first document from each source returned `unchanged`, retained each local count at 10 and preserved cursors. Local public catalogue now has 68 records.
- [x] Same-origin HTTP: both new sample details returned 200 through `http://localhost:3000/api/innovations/{slug}/`, with distinct source URL and `pending_review`. CTT source TRL 3 has `source` provenance; school TRL remains null/unknown.
- [x] `git diff --check` passed.

### Manual Verification
1. In `/admin`, open Public sources: CTT UŁ and IBE should appear in the business and administration/education categories.
2. Open an imported CTT record and school record: confirm distinct source URL, meaningful description and `pending_review` status.
3. Refresh one channel and confirm local counts reflect distinct records; imported records can be found in `/innovations`.

### Sign-Off
- **Verified By:** — (awaiting user manual confirmation)
- **Notes / Follow-Ups:** User authorized implementation with "to dorzuc" and a local checkpoint commit on `2026-11-22 06:18` ("commit"). Task remains `IN_PROGRESS` pending manual sign-off; no push or server deployment. Existing `frontend/tsconfig.tsbuildinfo` modification is unrelated and excluded from the checkpoint. Future coverage can add direct municipal/startup/patent channels; selected CTT/school publishers do not imply universal coverage.
