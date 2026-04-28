# Offline Meal Sync Smoke

Manual smoke for release builds when validating offline-first meal sync on a device.

1. Sign in and open History once while online.
2. Disable network.
3. Create a meal. Confirm it appears immediately in Home/History as pending.
4. Edit the same meal twice. Confirm the final values remain visible after navigating away and back.
5. Delete that meal. Confirm it disappears locally.
6. Re-enable network. Confirm one sync run clears the pending state and History does not show a failed-sync banner.
7. To validate failure visibility, point the app at an unavailable backend, create or edit a meal, reconnect, and let retries exhaust in a test build. Confirm History shows the failed meal operation and Retry moves it back to pending without duplicating the meal.

Covered by automated tests: queue coalescing, local read-model updates, selective reconnect sync, cursor pull, retry/dead-letter transitions, and duplicate-safe retry.
