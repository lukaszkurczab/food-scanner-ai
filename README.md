# Fitaly (`food-scanner-ai`)

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

- Node.js 18+ (20 LTS recommended)
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
RC_IOS_API_KEY=
RC_ANDROID_API_KEY=
TERMS_URL=
PRIVACY_URL=
DEBUG_OCR=true
DISABLE_BILLING=false
FORCE_PREMIUM=false

# only for the font download script
GOOGLE_FONTS_KEY=
```

Description:

- `EXPO_PUBLIC_API_BASE_URL` - base URL of the backend API used for AI, logging, and other server-managed features.
- `EXPO_PUBLIC_API_VERSION` - backend API version prefix used by the app.
- `EXPO_PUBLIC_ENABLE_BACKEND_LOGGING` - enables forwarding selected client errors to the backend logging endpoint.
- `RC_IOS_API_KEY` - RevenueCat iOS API key (required for iOS subscriptions).
- `RC_ANDROID_API_KEY` - RevenueCat Android API key (required for Android subscriptions).
- `TERMS_URL` - terms and conditions URL (used in paywall/subscription screens).
- `PRIVACY_URL` - privacy policy URL.
- `DEBUG_OCR` - OCR debug flag (`true`/`false`).
- `DISABLE_BILLING` - disables billing in dev (`true`/`false`).
- `FORCE_PREMIUM` - premium testing flag (`true`/`false`).
- `GOOGLE_FONTS_KEY` - used only by `npm run fonts:download`.

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
