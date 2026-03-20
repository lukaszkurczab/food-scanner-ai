# Coach Insights v1 (Mobile)

## Purpose

Coach Insights v1 is a Home coaching layer, not a separate product surface.

- `CoachInsightCard` is the only proactive coach surface for days with renderable live insight data.
- `EmptyDayView` can be plain or coach-aware.
- Chat remains the reactive deep-dive surface.

## Response Semantics Consumed by Mobile

Mobile expects the backend `CoachResponse` contract to be strict:

- `source` is always `"rules"`.
- `topInsight` must match `insights[0]` when insights exist.
- `meta.available=true` is required for a live-valid coach payload.
- `meta.emptyReason` is only meaningful when `topInsight=null` and `insights=[]`.
- `meta.emptyReason` can only be `"no_data"` or `"insufficient_data"`.

Mobile rejects contract-drifted payloads instead of coercing them into fake success states.

## Failure Semantics

`useCoach` and `coachService` expose these states:

| Source | Status | Meaning on Home |
|--------|--------|-----------------|
| `remote` or `memory` | `live_success` | Healthy live-valid coach payload. Renderable. |
| `memory` or `storage` | `stale_cache` | Cached coach payload after fetch failure. Not renderable as live coach UI. |
| `fallback`, `memory`, or `storage` | `invalid_payload` | Parseable but domain-invalid payload. Not renderable as coach UI. |
| `disabled` | `disabled` | Coach foundation disabled. Plain empty state only. |
| `fallback` | `service_unavailable` | Coach endpoint unavailable and no healthy live payload. Plain empty state only. |
| `fallback` | `no_user` | No authenticated user. Plain empty state only. |

## Empty-Day Modes

### Plain Empty Day

Default mode when Home does not have a live-valid coach empty-state payload.

- No coaching box.
- No `coach_empty_state_viewed` telemetry.
- Used for disabled, service unavailable, invalid payload, stale cache, and no-user paths.

### Coach-Aware Empty Day

Rendered only when all of the following are true:

- `useCoach.status === "live_success"`
- `useCoach.isStale === false`
- `useCoach.source` is `remote` or `memory`
- `coach.dayKey` matches the selected Home day
- `coach.meta.available === true`
- `coach.topInsight === null`
- `coach.meta.emptyReason` is `no_data` or `insufficient_data`

In that mode, Home renders the coaching note and may emit `coach_empty_state_viewed`.

## Telemetry Expectations

Coach telemetry stays intentionally narrow:

- `coach_card_viewed`: `insightType`, `actionType`, `isPositive`
- `coach_card_expanded`: `insightType`
- `coach_card_cta_clicked`: `insightType`, `actionType`, `targetScreen`
- `coach_empty_state_viewed`: `emptyReason`

`coach_empty_state_viewed` must only be emitted when the UI actually renders the coach-aware empty state.

