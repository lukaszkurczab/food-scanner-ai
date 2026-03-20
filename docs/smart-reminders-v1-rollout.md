# Smart Reminders v1 — Mobile Rollout Runbook

## 1. Prerequisites

### Mobile flags

| Flag | Required value | Purpose |
|---|---|---|
| `EXPO_PUBLIC_ENABLE_V2_STATE` | `true` | NutritionState v2 — reminder input source |
| `EXPO_PUBLIC_ENABLE_SMART_REMINDERS` | `true` | Smart Reminders data layer + scheduling |
| `EXPO_PUBLIC_ENABLE_TELEMETRY` | `true` | Emit telemetry events for observability |

### Backend flags (all required before enabling mobile)

| Flag | Required value | Purpose |
|---|---|---|
| `STATE_ENABLED` | `true` | Nutrition state endpoint |
| `HABITS_ENABLED` | `true` | Habit signals in state |
| `SMART_REMINDERS_ENABLED` | `true` | Decision endpoint |
| `TELEMETRY_ENABLED` | `true` | Accept mobile telemetry |

### Flag dependency order

```
Backend: STATE_ENABLED → HABITS_ENABLED → SMART_REMINDERS_ENABLED
Mobile:  EXPO_PUBLIC_ENABLE_V2_STATE → EXPO_PUBLIC_ENABLE_SMART_REMINDERS
```

Enable backend flags first, then mobile. Disable in reverse order.

`EXPO_PUBLIC_*` changes require an app rebuild (Expo does not hot-reload env vars).

## 2. What mobile does

Mobile fetches a `ReminderDecision` from the backend and acts on it locally:

```
GET /api/v2/users/me/reminders/decision?day=YYYY-MM-DD&tzOffsetMin=<int>
```

- Fetches on app foreground (with 60-second cooldown) and on auth-ready
- Schedules a local notification when `decision="send"` using backend-provided `scheduledAtUtc`
- Cancels any existing scheduled reminder when `decision="suppress"` or `"noop"`
- Cancels any existing scheduled reminder on failure (service_unavailable, invalid_payload)
- Does NOT reconstruct schedule times from local clock — always uses canonical `scheduledAtUtc`
- Sends `tzOffsetMin` (device timezone offset) in every request

## 3. Behavior by status

| Status | Meaning | Scheduling effect | Telemetry event |
|---|---|---|---|
| `disabled` | `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=false` | No-op, legacy scheduling resumes | none |
| `no_user` | No authenticated user | No-op | none |
| `live_success` + `send` | Backend says schedule a reminder | Schedule local notification at `scheduledAtUtc` | `smart_reminder_scheduled` |
| `live_success` + `suppress` | Backend blocked the reminder | Cancel existing schedule | `smart_reminder_suppressed` |
| `live_success` + `noop` | No reminder opportunity | Cancel existing schedule | `smart_reminder_noop` |
| `service_unavailable` | Backend unreachable or 5xx | Cancel existing schedule | `smart_reminder_decision_failed` |
| `invalid_payload` | Backend returned malformed response | Cancel existing schedule | `smart_reminder_decision_failed` |

### Strict failure policy

When `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=true`:

- Legacy `meal_reminder` and `day_fill` scheduling is suppressed **unconditionally**
- Decision failure results in **no notification**, not a silent fallback to legacy
- This is intentional: partial notification delivery is worse than no delivery
- Other notification types (`calorie_goal`, system) are unaffected

## 4. Telemetry events

| Event | When | Key props |
|---|---|---|
| `smart_reminder_scheduled` | `decision=send` + successfully scheduled | `reminderKind`, `decision`, `confidenceBucket`, `scheduledWindow` |
| `smart_reminder_suppressed` | `decision=suppress` | `suppressionReason`, `confidenceBucket` |
| `smart_reminder_noop` | `decision=noop` | `noopReason`, `confidenceBucket` |
| `smart_reminder_decision_failed` | Backend unreachable or invalid payload | `failureReason` |
| `smart_reminder_schedule_failed` | Local scheduling error | `failureReason`, `reminderKind`, `confidenceBucket` |

Confidence buckets: `low` (<0.5), `medium` (0.5–0.8), `high` (>=0.8).

Scheduled windows: `overnight` (<6:00), `morning` (6:00–12:00), `afternoon` (12:00–17:00), `evening` (17:00–21:00), `late_evening` (>=21:00).

## 5. QA verification

### 5a. Feature flag gate

1. Set `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=false`, rebuild
2. Open Notifications screen in dev mode
3. Verify: Smart Reminder QA section shows `status: disabled`, `enabled: false`
4. Verify: legacy meal/day reminders schedule normally

### 5b. Happy path (send)

1. Set `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=true`, rebuild
2. Ensure backend is running with `SMART_REMINDERS_ENABLED=true`
3. Log in, open app → reconciliation runs on foreground
4. Dev mode: Notifications screen shows `status: live_success`, `decision: send`, valid `schedule` range
5. Verify: local notification is scheduled (check via Expo notification debugger)
6. Verify: `smart_reminder_scheduled` telemetry event emitted

### 5c. Suppress path

1. Configure quiet hours on backend to include current time
2. Or: trigger 3 send decisions for same day (frequency cap)
3. Verify: `status: live_success`, `decision: suppress`
4. Verify: no notification scheduled
5. Verify: `smart_reminder_suppressed` telemetry event with correct `suppressionReason`

### 5d. Failure path (strict policy)

1. Stop the backend or set `SMART_REMINDERS_ENABLED=false`
2. With `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=true`, foreground the app
3. Verify: `status: service_unavailable`
4. Verify: no notification scheduled (neither smart nor legacy meal/day)
5. Verify: `calorie_goal` notifications still work
6. Verify: `smart_reminder_decision_failed` telemetry event

### 5e. Auth transition

1. Log out while a smart reminder is scheduled
2. Verify: all smart reminder notification IDs for the previous user are cancelled
3. Log in as a different user
4. Verify: fresh reconciliation runs for the new user

### 5f. Dev mode QA panel

In `__DEV__` builds, the Notifications screen shows a "Smart Reminder QA" section with:
- `status` — current decision result status
- `source` — where the decision came from (`remote`, `fallback`, `disabled`)
- `enabled` — feature flag state
- `dayKey` — day the decision applies to
- `decision` — `send` / `suppress` / `noop`
- `kind` — reminder kind (only for `send`)
- `reasonCodes` — deterministic reason codes from backend
- `schedule` — `scheduledAtUtc → validUntil` range
- `confidence` — decision confidence score
- `error` — error message if decision failed

## 6. Rollback

### Primary: disable Smart Reminders on mobile

```env
EXPO_PUBLIC_ENABLE_SMART_REMINDERS=false
```

Effect:
- `getReminderDecision` returns `disabled` status without network call
- Legacy `meal_reminder` and `day_fill` scheduling resumes normally
- Existing scheduled smart reminders fire (they are local), new ones stop
- Requires app rebuild

### Secondary: disable on backend

```env
SMART_REMINDERS_ENABLED=false
```

Effect:
- Backend returns `503` for all decision requests
- Mobile receives `service_unavailable` → cancels any scheduled smart reminders
- Strict failure policy means no legacy fallback while mobile flag is still on
- No app rebuild required

### Emergency: both

Disable both `SMART_REMINDERS_ENABLED=false` (backend) and `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=false` (mobile).

### Rollback verification

1. No new `smart_reminder_*` telemetry events
2. Dev mode QA shows `status: disabled` or `status: service_unavailable`
3. Legacy meal/day reminders resume (if mobile flag is off)
4. Existing scheduled notifications still fire (they are local)

## 7. Known limitations in v1

- **No per-user rollout** — feature flag is global
- **No IANA timezone** — uses fixed offset; DST transitions resolve on next reconcile
- **No staleness guard** — if mobile caches a decision and never re-reconciles, the decision stays
- **No delivery confirmation** — backend counts `send` decisions, not actual deliveries
- **Cooldown on foreground** — 60-second throttle between reconciliations; rapid app switches won't re-fetch
- **Requires rebuild** — `EXPO_PUBLIC_*` flags require Expo rebuild, not hot reload
