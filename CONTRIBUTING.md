# Contributing to Fitaly (mobile)

## Branches

| Pattern | Purpose |
|---------|---------|
| `main` | Production-ready code; protected, requires PR |
| `feat/<short-name>` | New features |
| `fix/<short-name>` | Bug fixes |
| `chore/<short-name>` | Tooling, deps, config |

## Pull Requests

- One logical change per PR; keep diffs reviewable
- Title format: `type: short description` (e.g. `feat: add meal duplicate action`)
- Link the relevant issue if one exists
- All CI checks must be green before merge (lint, typecheck, tests, launch-readiness)
- Do not merge your own PR without a review on feature/fix branches

## Local setup

```bash
npm ci
cp .env.example .env          # fill in local values
npx expo start
```

For a local backend, set `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000` in `.env`.

## Running checks

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm test              # Jest unit tests
npm run check:launch-readiness:android   # production config gate
npm run check:launch-readiness:ios
```

## Environment and build profiles

The canonical mapping of EAS build profiles to backend URLs lives in `eas.json`.
The `.env.example` documents the same mapping for local development.
**Never diverge these two sources.** If you change a backend URL, update both.

| Profile | Backend |
|---------|---------|
| `smoke` / `development` / `preview` / `internal` / `e2e-test` | `fitaly-backend-smoke.up.railway.app` |
| `production` / `production-apk` | `fitaly-backend-production.up.railway.app` |

## API contract changes

When you add, remove, or rename a field in a request/response that the backend also produces:

1. Open a PR in `fitaly-backend` first (or simultaneously) with the backend change
2. Update the contract snapshot in `scripts/verify-backend-contract.sh`
3. CI will verify sync automatically — do not skip or `SKIP` the contract check

## Adding or changing features behind a flag

Feature flags live in `app.config.js` (`extra.*`) and are read from `EXPO_PUBLIC_*` env vars.

- Default **off** in production until explicitly enabled
- Document the flag in `eas.json` comments if it affects a build profile

## Release checklist

Before tagging a release build:

- [ ] `CHANGELOG.md` updated with changes since last version
- [ ] Version bumped in `package.json` and `app.config.js`
- [ ] `npm run check:launch-readiness:android` passes locally with production env
- [ ] `npm run check:launch-readiness:ios` passes locally with production env
- [ ] E2E Maestro flows pass on a real device or EAS build
- [ ] `EXPO_PUBLIC_ENABLE_BACKEND_LOGGING` is `false` in `eas.json` production profile
- [ ] RC keys set as EAS Secrets (`eas secret:list` to verify)
