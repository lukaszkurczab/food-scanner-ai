## Project Context

- Stack: Expo SDK 53, React Native 0.79.x, React 19, TypeScript.
- Backend/services: Firebase (auth, firestore, storage), RevenueCat (react-native-purchases), i18next.
- Tooling: ESLint v8, tsc typecheck.

## Operating Mode

- For any non-trivial task (>= 3 steps, architectural choice, or ambiguous requirements): start with a short plan (bullets).
- If something goes sideways or assumptions change: stop, re-plan, and explain.
- Prefer the smallest correct change. Avoid refactors unless requested.

## Codebase First

- Search the repo for existing patterns (navigation, hooks, services, theme, i18n) and follow them.
- Do not introduce new dependencies or native modules unless explicitly requested.

## TypeScript / Quality Gates

- Do not weaken types to “make it compile” (avoid `any`, broad `as`, disabling rules) unless there is no alternative—then isolate and justify.
- Keep exports and public APIs stable; avoid breaking changes unless requested.
- If code touches cross-feature logic, prefer extracting to `services/` or `utils/` consistent with existing structure.

## React Native / Expo Constraints

- Prefer Expo-compatible APIs and existing dependencies; avoid adding custom native code.
- When touching camera/media/filesystem: respect platform permissions and failure states (denied, restricted, limited).
- Be mindful of performance: avoid unnecessary re-renders, heavy work on render path, and large images in memory.

## Firebase Rules

- Never log or persist secrets. Do not hardcode API keys or service credentials.
- Firestore: prefer predictable document shapes, explicit typing, and minimal reads/writes.
- Handle offline/latency: assume network can fail; provide user-safe fallbacks where relevant.

## RevenueCat Rules

- Do not change entitlement/offerings naming assumptions without checking existing constants/usages.
- Subscription state handling must be consistent and resilient (cache vs remote, sandbox vs prod).

## i18n Rules

- All user-facing strings must be translated via i18next (no hardcoded UI strings), unless explicitly stated otherwise.
- When adding keys: keep naming consistent, and update all required locales.

## Verification Before Done

- Never claim “done” without verification.
- Always run: `npm run typecheck` (or `pnpm/yarn` equivalent in this repo).
- If tests exist for the touched area: run them; otherwise provide a short manual verification checklist.
- For UI flows: list the exact screens/steps verified (iOS + Android if relevant).

## Bug-Fix Protocol

- Given a log/error: identify root cause and fix it (no band-aids).
- If multiple plausible causes: state top 1–2 hypotheses and the quickest confirmation path.
- Add a regression test when feasible; otherwise document reproducible steps.

## Communication (IDE)

For each change-set, include:

- What changed (1–3 bullets)
- Why
- How verified (commands run / steps)

## Guardrails

- No destructive actions (delete/migrate/overwrite data, breaking schema changes) without explicit confirmation.
- No output of personal data from logs/screenshots; redact identifiers.
