# Smart Reminders v1 — Rollout Notes (Archived)

This document is archived and kept only for migration history.

Canonical source of truth for current production behavior, debugging, and release smoke:

- [`docs/notifications-canonical-release-hardening.md`](./notifications-canonical-release-hardening.md)

Current policy:

1. Canonical path is only `smart reminders decision -> strict validation -> local scheduling/cancellation -> runtime reconcile`.
2. Legacy meal/day reminder form-based flow is not an active mobile production entrypoint.
3. Failure paths must remain explicit (`service_unavailable`, `invalid_payload`, permission/channel/scheduling failures) and cannot silently fallback to legacy reminder behavior.

For backend-side contract and telemetry semantics, use:

- `../fitaly-backend/docs/smart-reminders-v1.md`
- `../fitaly-backend/docs/smart-reminders-v1-rollout.md` (archival rollout history)
