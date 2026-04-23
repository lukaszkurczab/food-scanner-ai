# Firestore Security Model v2 (User-Owned)

## Canonical Firestore paths

- User profile: `users/{uid}`
- Meals: `users/{uid}/meals/{mealId}`
- Saved meals: `users/{uid}/myMeals/{mealId}`
- Chat threads: `users/{uid}/chat_threads/{threadId}`
- Chat messages: `users/{uid}/chat_threads/{threadId}/messages/{messageId}`
- Streak: `users/{uid}/streak/{docId}`
- Badges: `users/{uid}/badges/{badgeId}`
- Notifications: `users/{uid}/notifications/{notificationId}`
- Preferences: `users/{uid}/prefs/{docId}`
- Feedback: `users/{uid}/feedback/{feedbackId}`
- Billing snapshot: `users/{uid}/billing/main/aiCredits/current`
- Billing ledger: `users/{uid}/billing/main/aiCreditTransactions/{txId}`

## Firestore access model

- `usernames/{username}`:
  - `get` is public for availability checks
  - `list` denied
  - `create/update/delete` only when `uid == request.auth.uid`
- `users/{uid}` and user-owned domain subcollections:
  - access only for `request.auth.uid == uid`
- Billing subtree:
  - owner can `read` canonical docs
  - all client `write` operations denied (backend/admin SDK is source of truth)
- Backend-owned internal/user-derived subtrees (e.g. `daily_stats`, `chat_threads/*/memory`):
  - client read/write denied
- Deny-by-default:
  - explicit global fallback deny for all unmatched paths

## Storage alignment

- Canonical feedback path: `feedback/{uid}/{feedbackId}/{filename}`
- Legacy path `feedbacks/**` is blocked and marked for sunset.

## Legacy collections blocked (sunset target: 2026-06-30)

- `ai_credits/**`
- `ai_credit_transactions/**`
- `ai_gateway_logs/**`
- `feedbacks/**`
- `users/{uid}/history/**`

## Non-domain/global collections blocked from client SDK

- `telemetry_events/**`
- `ai_runs/**`
- `rate_limits/**`
- `_healthcheck/**`

## Backend/mobile query-path alignment notes

- Mobile app uses backend APIs for meals/chat/billing and does not query Firestore directly for these paths.
- Backend reads/writes billing only via `users/{uid}/billing/main/...`.
- No runtime backend reads/writes to legacy top-level credits collections remain.
