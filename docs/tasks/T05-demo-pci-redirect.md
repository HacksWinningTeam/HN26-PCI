# `T05` — Demo PCI Login Opens Admin

- **Status:** `IN_PROGRESS`
- **Layer:** `Frontend`
- **UI Design Required:** `No`
- **Depends On:** None
- **Traces To:** REQ-07, REQ-11, DEC-019

## Goal & User Outcome

The “Demo PCI” login opens `/admin` immediately after successful authentication.

## Scope & Non-Goals

- Change only the demo operator login destination, including when `next` points elsewhere.
- Preserve ordinary login, organization demo and operator access checks.

## UI Design (Per-Task)

N/A — routing correction explicitly requested by the user; no layout or visual changes.

## Technical Implementation Plan

- In `frontend/src/app/login/page.tsx`, pass a demo-operator flag to the existing login handler. After login succeeds, navigate to `/admin` with the new cookie session before publishing client auth state. This avoids a competing redirect from the shared login-page guard.
- No backend, dependency, configuration or environment changes.

## Acceptance Criteria

- [x] Demo PCI success targets `/admin` regardless of `next`.
- [x] Failed login remains on the login form and shows its error.
- [x] Standard login and organization demo retain their current destination rules.
- [ ] User confirms manual verification.

## Verification Checklist

### Automated Checks

- [x] Local `npm run typecheck` and `npm run lint` passed, zero errors/warnings.
- [x] Local `npm test` passed: 43/43 existing tests. Existing Node module-type warnings remain; no failures. No new tests added for this fixed-destination button callback; the configured runner has no browser/component harness.
- [x] Local `npm run build -- --webpack` passed, including TypeScript, page generation and standalone tracing.
- [x] `git diff --check` passed.
- Docker-based `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod` remain excluded per the documented user restriction. Backend/API/models are unchanged.

### Manual Verification

1. While signed out, open `/login`, choose “Demo PCI”: the final URL is `/admin` and the operator panel loads.
2. Repeat from `/login?next=%2Fworkspace` and `/login?next=%2Fcompare`: Demo PCI still opens `/admin`.
3. Check the organization Demo and standard login continue honoring their existing destination rules. Incorrect credentials still show an error on the form.

### Sign-Off

- **Verified By:** —
- **Notes / Follow-Ups:** User closed admin work and requested a local commit at 2026-11-22 02:43 (DEC-026), including this redirect. Browser login flow has not been manually exercised, so status is not marked `VERIFIED`. T04's broader unimplemented visual cleanup is cancelled; no further admin changes are scheduled.
