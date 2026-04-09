# Public Launch Readiness 2026-04-08

This file is the current source of truth for public launch automation in `fitaly`.

## What is enforced in repo

- Mobile CI is callable as a reusable workflow and remains the release config gate.
- `E2E Smoke Gate` is reusable and scheduled nightly.
- `Release Candidate` reruns mobile CI, backend CI, smoke E2E, smoke export verification, and produces `release-evidence.md`.
- Production Android readiness now blocks if `targetSdkVersion < 35`.
- Workflow failures for security, smoke E2E, release candidate, backend monitoring, and backup/restore notify Discord via `OPS_ALERT_DISCORD_WEBHOOK_URL`.

## What is still manual

- The GitHub `production` environment reviewer must be configured in repository settings.
- Sentry production alert rules must route to the Discord bot outside the repo.
- Disposable smoke delete verification is manual by design and must be attached to `release-evidence`.

## Evidence expectations

- `release-evidence` must contain mobile SHA, backend SHA, smoke export summary, latest successful backup link, latest successful restore drill link, and delete-evidence URL.
- A public launch is `No-Go` if any evidence line item is missing or points to a failed run.

## Historical note

- The external audit document from 2026-04-07 is now historical context only. The actionable state lives in this repository and in `../fitaly-backend`.
