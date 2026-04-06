# Fitaly Launch Runbook (Go/No-Go)

## Scope

This runbook is the operational source of truth for release candidates and public rollout of:

- `fitaly` (mobile app)
- `fitaly-backend` (FastAPI backend)

## Ownership

- Release manager: Engineering Lead
- Mobile runtime/config gate: Mobile Engineer
- Backend runtime/config gate: Backend Engineer
- Store metadata/compliance: Product + Ops
- Incident commander (Day0-Day7): Engineering Lead

## Go/No-Go Checklist

All checks are mandatory. Any failed line item means **No-Go**.

- Mobile CI passes (`lint`, `typecheck`, tests, launch-readiness config gate).
- Backend CI passes (`ruff`, `pyright`, `pytest`).
- Cross-repo contract sync job is green.
- RC smoke E2E passes on prepared runner:
  - `foundation-smoke.yaml`
  - `account-launch-smoke.yaml`
- `TERMS_URL` and `PRIVACY_URL` are valid HTTPS URLs and resolve publicly.
- `EXPO_PUBLIC_API_BASE_URL` mapping is correct:
  - `development/preview/internal/e2e-test` -> `https://fitaly-backend-smoke.up.railway.app`
  - `production` -> `https://fitaly-backend-production.up.railway.app`
- Backend production env is complete:
  - explicit `CORS_ORIGINS` (no wildcard `*`)
  - `OPENAI_API_KEY`
  - `FIREBASE_PROJECT_ID`
  - Firebase credentials source:
    - `GOOGLE_APPLICATION_CREDENTIALS`, or
    - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- Android release artifact is AAB.
- **RC artifact confirmation:** `targetSdk >= 35` must be explicitly confirmed from build output before store submission.

## Release Steps (RC -> Public)

1. Build RC with `internal` profile.
2. Run smoke E2E gate workflow (`E2E Smoke Gate`) and archive results.
3. Execute manual sanity check on both platforms.
4. Build production artifacts (`publish:android`, `publish:ios`).
5. Upload to store tracks with phased rollout.
6. Monitor Day0-Day7 metrics and incident channels.

## Rollback Matrix

- Routing/config regression:
  - Rollback action: stop rollout, rebuild with corrected env mapping.
- Backend startup failures (CORS/Firebase/OPENAI):
  - Rollback action: restore previous working deployment and correct missing production variables.
- Smart Reminders incident:
  - Rollback action: `SMART_REMINDERS_ENABLED=false`.
- Weekly Reports incident:
  - Rollback action: `WEEKLY_REPORTS_ENABLED=false`.
- Telemetry ingest incident:
  - Rollback action: `TELEMETRY_ENABLED=false`.
- Severe user-impacting issue:
  - Rollback action: pause rollout/unpublish until hotfix is validated.

## Kill-Switch Strategy

- Primary kill-switches are backend feature flags.
- Secondary mitigation is store rollout pause.
- Tertiary mitigation is full rollback to previous backend release.

## Incident Flow (Day0-Day7)

1. Open incident channel and assign incident commander.
2. Freeze new releases.
3. Capture scope and affected versions (mobile + backend).
4. Apply relevant kill-switch or rollback.
5. Validate mitigation on staging and production health checks.
6. Publish post-incident summary with remediation tasks.
