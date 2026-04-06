# Fitaly (`fitaly`)

An Expo/React Native mobile app for scanning meals (photo, text, barcode), analyzing nutrition values, tracking history and statistics, and supporting premium features.

AI execution is backend-managed: the app calls backend AI endpoints and does not execute OpenAI requests directly on the client.

## Stack

- Expo SDK 53
- React Native 0.79.x + React 19
- TypeScript
- Firebase (`auth`, `firestore`, `storage`)
- RevenueCat (`react-native-purchases`)
- i18next (PL/EN localizations)

## Project Structure

Core principle: functional code belongs in `feature/*` modules, and the global layer is only for shared code.

```text
src/
  feature/
    Auth/
    Home/
    Meals/
    History/
    Statistics/
    UserProfile/
    Subscription/
    AI/
    Onboarding/
  components/   # global shared UI components
  hooks/        # global hooks
  services/     # global services (e.g. firebase, billing, offline)
  utils/        # global helpers
  theme/        # styling and themes
  navigation/   # app navigation
  types/        # global types
  locales/      # i18n translations
```

## Requirements

- Node.js 22 LTS
- npm
- Expo CLI (`npx expo ...`)
- For native builds:
- Android Studio (Android)
- Xcode + CocoaPods (iOS, macOS)

## Installation and Run

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root (template below).

3. Run the app:

```bash
# Expo (dev server)
npm run start

# Expo dev client
npm run dev

# Native run
npm run android
npm run ios
```

4. Code quality checks:

```bash
npm run lint
npm run typecheck
```

5. Tests:

```bash
# full suite + coverage
npm run test

# targeted run for changed area (recommended during day-to-day work)
npm run test -- src/hooks/__tests__/useMeals.test.ts
```

## Environment Variables

File: `.env`

```bash
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_API_VERSION=v1
EXPO_PUBLIC_ENABLE_BACKEND_LOGGING=true
EXPO_PUBLIC_ENABLE_TELEMETRY=false
EXPO_PUBLIC_ENABLE_V2_STATE=false
RC_IOS_API_KEY=
RC_ANDROID_API_KEY=
TERMS_URL=
PRIVACY_URL=
DEBUG_OCR=false
DISABLE_BILLING=false
FORCE_PREMIUM=false

# only for the font download script
GOOGLE_FONTS_KEY=
```

Description:

- `EXPO_PUBLIC_API_BASE_URL` - base URL of the backend API used for AI, logging, and other server-managed features.
- `EXPO_PUBLIC_API_VERSION` - backend API version prefix used by the app.
- `EXPO_PUBLIC_ENABLE_BACKEND_LOGGING` - enables forwarding selected client errors to the backend logging endpoint.
- `EXPO_PUBLIC_ENABLE_TELEMETRY` - enables mobile telemetry batching and P0 event emission. **Also requires backend `TELEMETRY_ENABLED=true`.**
- `EXPO_PUBLIC_ENABLE_V2_STATE` - enables the mobile consumer for `/api/v2/users/me/state` with local fallback caching. **Also requires backend `STATE_ENABLED=true`.**
- `EXPO_PUBLIC_ENABLE_SMART_REMINDERS` - enables the mobile consumer for `GET /api/v2/users/me/reminders/decision?day=YYYY-MM-DD` and Smart Reminders scheduling runtime. **Also requires backend `SMART_REMINDERS_ENABLED=true`.**
- `RC_IOS_API_KEY` - RevenueCat iOS API key (required for iOS subscriptions).
- `RC_ANDROID_API_KEY` - RevenueCat Android API key (required for Android subscriptions).
- `TERMS_URL` - terms and conditions URL (used in paywall/subscription screens).
- `PRIVACY_URL` - privacy policy URL.
- `DEBUG_OCR` - OCR debug flag (`true`/`false`). Keep `false` for production.
- `DISABLE_BILLING` - disables billing in dev (`true`/`false`).
- `FORCE_PREMIUM` - premium testing flag (`true`/`false`).
- `GOOGLE_FONTS_KEY` - used only by `npm run fonts:download`.

### Foundation flags

These flags control v2 foundation surfaces introduced in the Foundation Sprint. Each requires a matching backend flag — see [Coach Insights v1 Rollout](./docs/coach-insights-v1-rollout.md).

| Mobile flag                          | Backend flag              | What it enables                                                                                               |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_ENABLE_TELEMETRY`       | `TELEMETRY_ENABLED`       | P0 event emission → v2 batch ingest                                                                           |
| `EXPO_PUBLIC_ENABLE_V2_STATE`        | `STATE_ENABLED`           | NutritionState v2 consumer on Home screen (targets, consumed, remaining, quality, habits, streak, AI summary) |
| `EXPO_PUBLIC_ENABLE_SMART_REMINDERS` | `SMART_REMINDERS_ENABLED` | Smart Reminders v1 decision fetch + mobile scheduling behavior                                                |

To enable for QA: set both the mobile flag (`true`) and the backend flag (`true`), then rebuild the app (Expo requires rebuild for `EXPO_PUBLIC_*` changes).

### Production release checks

`publish:android`, `publish:ios`, `build:android`, and `build:ios` run `scripts/check-launch-readiness.mjs` before EAS.

The production check blocks release when:

- `TERMS_URL` or `PRIVACY_URL` are missing/invalid
- `eas.json` API base URL mapping does not match required dev(smoke)/production split
- `eas.json` production Android artifact is not `app-bundle`
- Firebase native config files do not match `com.lkurczab.fitaly` (`google-services.json`, `GoogleService-Info.plist`)

### v2 selective adoption

The mobile app uses v2 endpoints selectively:

- **Telemetry**: When `EXPO_PUBLIC_ENABLE_TELEMETRY=true`, the telemetry client batches events and sends them to `POST /api/v2/telemetry/events/batch`.
- **NutritionState**: When `EXPO_PUBLIC_ENABLE_V2_STATE=true`, the Home screen fetches from `GET /api/v2/users/me/state?day=YYYY-MM-DD` with local fallback caching. If the backend is unreachable or the flag is disabled, the consumer falls back to locally-computed state.
- **Smart Reminders**: When `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=true`, the app fetches `GET /api/v2/users/me/reminders/decision?day=YYYY-MM-DD`, schedules only `decision="send"`, and cancels on `suppress`, `noop`, invalid payload, or failure. Mobile schedules from canonical backend `scheduledAtUtc`, not reconstructed local clock fields. Device notification permission stays a mobile execution concern, not part of the backend reminder decision contract.
- **Smart Reminders scope**: Smart Reminders v1 currently depend on NutritionState, habit signals already surfaced through state, existing reminder preferences, and current-time evaluation context. Coach Insights v1 remain a separate surface and are not a runtime input to reminder decisions in v1.

All other features (meals, AI chat, photo analysis, subscriptions) continue to use v1 endpoints.

If AI features are enabled locally, the mobile app still needs a reachable backend configured through `EXPO_PUBLIC_API_BASE_URL`; the OpenAI API key now lives only on the backend.

Additionally, native Firebase config files are required:

- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

## Development

Architecture guidelines:

- By default, add new code under `src/feature/<FeatureName>/` (`screens`, `components`, `hooks`, `services`, `types`).
- Treat feature code as private: do not import directly between features.
- If code is reused by 2+ features, move it to the global layer (`components`, `hooks`, `services`, `utils`, `theme`, `types`).
- Use the `@/` alias for cross-folder imports.
- Keep import direction: `screens -> feature internals -> global -> SDK`.
- All UI strings should go through i18next (`src/locales/...`), no hardcoded UI text.
- Prefer named exports; use default export only where already consistent (e.g. screens).
- Before finishing changes, always run:

```bash
npm run lint
npm run typecheck
```

Testing policy:

- Prefer targeted tests for touched files/features during regular development.
- Run the full test suite before releases, large refactors, or cross-feature changes.

## E2E Smoke

High-value Maestro smoke flows are available under `e2e/maestro/`.

```bash
# foundation smoke: login + add meal + chat + offline banner
npm run e2e:foundation

# existing focused flows
npm run e2e:login
npm run e2e:add-meal
npm run e2e:chat-ai
npm run e2e:offline-error
```

## Operator docs

- [Launch Runbook](./docs/launch-runbook.md) — Go/No-Go checklist, rollback matrix, kill-switch and incident flow
- [Coach Insights v1 Semantics](./docs/coach-insights-v1.md) — mobile contract handling, empty-state modes, telemetry rules
- [Coach Insights v1 Rollout](./docs/coach-insights-v1-rollout.md) — preconditions, verification, rollback behavior
- Smart Reminders v1 Semantics — see backend companion docs in `fitaly-backend/docs/smart-reminders-v1.md`
- Smart Reminders v1 Rollout — see backend companion docs in `fitaly-backend/docs/smart-reminders-v1-rollout.md`
