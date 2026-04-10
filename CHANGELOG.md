# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the app version in `app.config.js` / `package.json`.

---

## [1.0.1] – Unreleased

### Security
- Removed RevenueCat API key from debug logs (`revenuecat.ts`); replaced with boolean presence flag
- Redacted Google Fonts API key from error messages in `download-fonts.mjs`
- Added `RC_ANDROID_API_KEY` / `RC_IOS_API_KEY` to CI launch-readiness checks via GitHub Secrets

### Changed
- Gunicorn worker count increased from 2 to 4 in backend Procfile (tracked here for cross-repo visibility)
- Added Sentry React Native SDK; set `SENTRY_DSN` and `SENTRY_ENVIRONMENT` as EAS secrets for smoke and production profiles

### Fixed
- CI `cross-repo contract sync` step now resolves to correct backend repo (`fitaly-backend`)

---

## [1.0.0] – Initial release

### Added
- Meal logging with AI photo analysis and barcode scanning
- AI chat coach with gateway, credits, and rate limiting
- Smart reminders with local notifications
- Streak tracking and badge awards
- Weekly nutrition report
- RevenueCat billing integration (iOS + Android)
- Firebase Auth + Firestore data layer
- EAS build pipeline with smoke / production profiles
- Launch readiness pre-build validation script
- E2E Maestro test suite
