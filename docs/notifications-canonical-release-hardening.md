# Canonical Notifications — Release Hardening (Smart Reminders + Local Scheduling)

## 1. Scope i definicje

Ten dokument dotyczy wyłącznie canonical production path:

1. `smart reminders decision` (backend decision endpoint)
2. strict payload validation po stronie mobile
3. local notification scheduling / cancellation
4. reconcile runtime (auth + foreground)

Legacy meal/day reminder path **nie jest** ścieżką produkcyjną.

### Rozróżnienie pojęć (nie są synonimami)

1. `scheduled`: notyfikacja została zapisana do harmonogramu lokalnego API (`scheduleNotificationAsync` zakończone sukcesem).
2. `delivered`: system OS uznał, że notyfikacja powinna zostać dostarczona do aplikacji / systemu.
3. `shown`: system UI faktycznie pokazał banner/list/tray (zależne od stanu app i polityki foreground).
4. `opened`: użytkownik wszedł w interakcję z notyfikacją (`addNotificationResponseReceivedListener`).

## 2. Zweryfikowana konfiguracja repo

### `app.config.js`

1. `expo-notifications` plugin jest aktywny.
2. Ustawiony jest `defaultChannel: "default"`.
3. Android ma jawnie `permissions: ["POST_NOTIFICATIONS"]`.

Plik: [/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/app.config.js](/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/app.config.js)

### Native output

1. Android manifest zawiera konfigurację notyfikacji pluginu (`default_notification_icon`, `default_notification_color`) i `VIBRATE`.
2. iOS `Info.plist` nie wymaga osobnego custom permission string dla lokalnych notyfikacji; runtime permission jest obsłużone przez `expo-notifications`.

Pliki:
- [/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/android/app/src/main/AndroidManifest.xml](/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/android/app/src/main/AndroidManifest.xml)
- [/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/ios/Fitaly/Info.plist](/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/ios/Fitaly/Info.plist)

### Env / build assumptions

1. `EXPO_PUBLIC_ENABLE_SMART_REMINDERS=true` w buildzie mobile.
2. `EXPO_PUBLIC_API_BASE_URL` i `EXPO_PUBLIC_API_VERSION` poprawnie ustawione.
3. Zmiany `EXPO_PUBLIC_*` wymagają rebuilda aplikacji.

## 3. Runtime policy (jawna i deterministyczna)

1. Foreground notification presentation policy jest jawnie ustawiona w app runtime.
2. Aktualna polityka: **nie pokazuj banner/list w foreground** (`shouldShowBanner=false`, `shouldShowList=false`).
3. To oznacza: notyfikacja może być `scheduled` i nawet `delivered`, ale nie będzie wizualnie pokazana gdy app jest aktywna.

Plik: [/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/src/services/notifications/notificationPresentationPolicy.ts](/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/src/services/notifications/notificationPresentationPolicy.ts)

## 4. Environment matrix — co testować gdzie

| Scenariusz | Expo Go | Emulator/Simulator | Dev Build na real device | Release build na real device |
|---|---|---|---|---|
| Permission flow | częściowo | częściowo | tak | tak |
| Android channel creation | ograniczone | ograniczone | tak | tak |
| Local scheduling API | możliwe, ale niewystarczające do release confidence | możliwe, ale niewystarczające do release confidence | tak | tak |
| Foreground/background UX zachowania OS | niska wiarygodność | niska wiarygodność | dobra | najwyższa |
| Release smoke (go/no-go) | nie | nie | warunkowo | tak |

### Reguła release

1. Finalna decyzja release dla notifications wymaga **real device smoke**.
2. Emulator/simulator/Expo Go służy do szybkiego dev feedbacku, nie do finalnej walidacji UX notyfikacji.

## 5. Debug surface dostępny w app

W `__DEV__` na ekranie Notifications są dwie sekcje:

1. `Smart Reminder QA`
2. `Notification Diagnostics`

Plik: [/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/src/feature/UserProfile/screens/NotificationsScreen.tsx](/Users/lukaszkurczab/Desktop/Projects/Fitaly/fitaly/src/feature/UserProfile/screens/NotificationsScreen.tsx)

Panel pokazuje:

1. `permission` + `permissionRequested` (czy kiedykolwiek request był wykonany)
2. `androidChannel` (`ensured/exists/error`)
3. backend decision (`status/source/decision/computedAt/validUntil/reasonCodes`)
4. `lastSchedulingResult` i `lastSchedulingFailure`
5. aktywne `scheduled IDs` z OS oraz local storage
6. runtime ownership (`initialized/currentUid/inFlight/appState`)
7. prefs i stan sync (`lastPrefsSyncStatus`, `lastPrefsSyncAt`, `lastSyncError`)
8. triage string (`ok/noop/blocked/failure/environment:not_testable`)

## 6. Jak odróżnić bug od ograniczenia środowiska

### `feature not testable in this environment`

Objawy:

1. `envReleaseSmokeSupported=false`
2. `triage` zaczyna się od `environment:not_testable:`

Wniosek:

1. To nie jest potwierdzony bug feature.
2. Przejdź na real device dev/release build i powtórz test.

### `permission denied`

Objawy:

1. `permission.granted=false`
2. `triage=blocked:permission_denied_or_ungranted`
3. `lastSchedulingResult` często kończy się `cancelled/permission_unavailable`

Wniosek:

1. To nie jest backend bug.
2. Odblokuj permission i ponów reconcile.

### `backend unavailable`

Objawy:

1. `Smart Reminder QA: status=service_unavailable`
2. `triage=blocked:backend_unavailable`
3. brak nowych schedule IDs

Wniosek:

1. Problem FE↔BE/network, nie OS notification UI.

### `payload invalid`

Objawy:

1. `Smart Reminder QA: status=invalid_payload`
2. `triage=blocked:backend_payload_invalid`

Wniosek:

1. Kontrakt danych decision endpoint jest złamany.

### `scheduled but not visibly presented`

Objawy:

1. `lastSchedulingResult=scheduled/scheduled`
2. `activeScheduledIds:*` nie są puste
3. app jest w foreground
4. `foregroundPresentation` pokazuje `banner=false`, `list=false`

Wniosek:

1. Feature nie musi być broken.
2. To oczekiwane zachowanie foreground policy/OS state.

## 7. Minimalny smoke plan przed releasem (canonical flow)

Wykonywać na **realnym urządzeniu**.

1. Fresh install builda.
2. Logowanie użytkownika.
3. Pierwszy permission request.
4. Android 13+ path: potwierdzić dialog runtime permission i rezultat w panelu diagnostycznym.
5. iOS path: potwierdzić wynik `granted/denied` i `canAskAgain`.
6. Enable Smart Reminders.
7. Zweryfikować decision fetch (`status/source/decision/computedAt/validUntil`).
8. Zweryfikować `activeScheduledIds` (OS + storage).
9. Poczekać do czasu triggera notyfikacji w tle aplikacji.
10. Sprawdzić foreground/background behavior (foreground może nie pokazać banneru zgodnie z policy).
11. Disable Smart Reminders i potwierdzić cleanup schedule.
12. Logout/Login i potwierdzić reset ownership + reconcile nowego uid.
13. Backend unavailable (wyłącz backend / odetnij endpoint) i potwierdzić `service_unavailable` + brak pozornego sukcesu.
14. Brak internetu i potwierdzić klasyfikację failure bez udawania success.
15. Invalid payload scenario (debug backend stub) i potwierdzić `invalid_payload`.

## 8. Checklista interpretacji wyniku testu

1. Czy `triage` wskazuje `ok`, `noop`, `blocked`, `failure`, czy `environment:not_testable`?
2. Czy permission jest rzeczywiście granted?
3. Czy Android channel jest `ensured=true` i `exists!=false`?
4. Czy decision status to `live_success`, czy failure (`service_unavailable` / `invalid_payload`)?
5. Czy schedule IDs istnieją po `send`?
6. Czy `lastSchedulingFailure` jest jawne i spójne z telemetry/logami?
7. Czy runtime jest aktywny dla zalogowanego `uid`?

## 9. Referencje (źródła zewnętrzne)

1. Expo Notifications SDK: [https://docs.expo.dev/versions/latest/sdk/notifications/](https://docs.expo.dev/versions/latest/sdk/notifications/)
2. Android notification runtime permission (POST_NOTIFICATIONS): [https://developer.android.com/develop/ui/views/notifications/notification-permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
3. Expo notification model i terminologia: [https://docs.expo.dev/push-notifications/what-you-need-to-know/](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
