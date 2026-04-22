import * as Notifications from "expo-notifications";
import { debugScope } from "@/utils/debug";

const log = debugScope("Notifications:PresentationPolicy");

const FOREGROUND_BEHAVIOR = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
} as const;

let initialized = false;

export function initNotificationPresentationPolicy(): void {
  if (initialized) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => FOREGROUND_BEHAVIOR,
  });
  initialized = true;
  log.log("foreground notification policy initialized", FOREGROUND_BEHAVIOR);
}

export function getNotificationPresentationPolicyDiagnostics(): {
  initialized: boolean;
  foregroundBehavior: typeof FOREGROUND_BEHAVIOR;
} {
  return {
    initialized,
    foregroundBehavior: FOREGROUND_BEHAVIOR,
  };
}

export function __resetNotificationPresentationPolicyForTests(): void {
  Notifications.setNotificationHandler(null);
  initialized = false;
}
