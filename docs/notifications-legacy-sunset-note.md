# Notifications Legacy Sunset Note

## Scope

This note tracks post-hardening cleanup of legacy notifications/reminders residue in mobile repo.

## Removed

1. `NotificationForm` production entrypoint (route + screen + hook).
2. Legacy frontend plan client (`src/services/notifications/planService.ts`) and its tests.
3. Legacy register-time seeding of `day_fill` reminder definitions (`createDefaultKeepLoggingNotification`).
4. Unused meal-kind picker component used only by removed legacy form.

## Retained (compatibility or operational reasons)

1. Notification preferences API usage (`/users/me/notifications/preferences`) remains active.
2. System notification scheduling (`motivation`, `stats`) remains active and is outside smart reminder decision endpoint.
3. Diagnostics and runtime clarity surfaces remain unchanged (`Notification Diagnostics`, scheduling snapshots, env/channel/permission checks).

## Why retained

1. Preferences are still canonical user control for smart reminders + system notifications.
2. Diagnostics are required for support/release triage and environment-vs-bug classification.

## Removal criteria for remaining compatibility surfaces

1. Confirm no active clients depend on legacy `/users/me/notifications` CRUD endpoints.
2. Remove backend compatibility routes and associated services/tests in a dedicated backend sunset step.
3. Keep this note updated together with backend companion note.
