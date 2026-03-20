# Coach Insights v1 Rollout (Mobile)

## Preconditions

Coach Insights v1 has no dedicated mobile flag. It depends on foundation surfaces:

- `EXPO_PUBLIC_ENABLE_V2_STATE=true`
- backend `STATE_ENABLED=true`
- backend `HABITS_ENABLED=true`

Telemetry is optional, but if coach telemetry is expected:

- `EXPO_PUBLIC_ENABLE_TELEMETRY=true`
- backend `TELEMETRY_ENABLED=true`

## Expected Runtime Behavior

- Home render must not block on coach.
- `CoachInsightCard` renders only for live-valid coach insight payloads.
- Empty day becomes coach-aware only for live-valid `meta.emptyReason`.
- Service failures, stale cache, and invalid payloads fall back to plain empty state.

## Verification Before Rollout

1. Verify a day with live coach insight renders `CoachInsightCard`.
2. Verify an empty day with live `emptyReason=no_data` or `insufficient_data` renders the coach-aware empty state.
3. Verify backend unavailability produces plain empty state and no coach-empty telemetry.
4. Verify stale cache after fetch failure does not render coach-aware empty state.
5. Verify `coach_empty_state_viewed` only appears when the coach-aware empty state is actually visible.

## Rollback Behavior

Coach Insights v1 rolls back through foundation controls, not a dedicated coach flag.

- Disable mobile consumption by setting `EXPO_PUBLIC_ENABLE_V2_STATE=false` and rebuilding.
- Or disable backend foundations by setting `STATE_ENABLED=false` or `HABITS_ENABLED=false`.

Rollback result on mobile:

- No `CoachInsightCard`
- Plain empty state instead of coach-aware empty state
- Home still renders through legacy nutrition paths and non-coach empty states

