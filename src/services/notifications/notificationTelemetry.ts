import * as Notifications from "expo-notifications";
import { AppState, type AppStateStatus } from "react-native";
import { asString, isRecord } from "@/services/contracts/guards";
import {
  trackNotificationFired,
  trackNotificationOpened,
  trackNotificationScheduled,
} from "@/services/telemetry/telemetryInstrumentation";
import { debugScope } from "@/utils/debug";

const log = debugScope("Notifications:Telemetry");

type NotificationTelemetryContext = {
  notificationType?: string | null;
  origin?: string | null;
};

type RemovableSubscription = {
  remove: () => void;
};

let initialized = false;
let currentAppState: AppStateStatus = AppState.currentState;
let appStateSubscription: RemovableSubscription | null = null;
let notificationReceivedSubscription: RemovableSubscription | null = null;
let notificationResponseSubscription: RemovableSubscription | null = null;

export function resolveNotificationTelemetryContext(
  data: unknown,
): NotificationTelemetryContext {
  if (!isRecord(data)) {
    return {
      notificationType: null,
      origin: null,
    };
  }

  const explicitOrigin = asString(data.origin) ?? asString(data.source);
  if (explicitOrigin) {
    return {
      notificationType:
        asString(data.type) ?? asString(data.sys) ?? null,
      origin: explicitOrigin,
    };
  }

  const systemType = asString(data.sys);
  if (systemType) {
    return {
      notificationType: systemType,
      origin: "system_notifications",
    };
  }

  const notificationType = asString(data.type);
  if (notificationType || asString(data.notifId)) {
    return {
      notificationType: notificationType ?? null,
      origin: "user_notifications",
    };
  }

  return {
    notificationType: null,
    origin: null,
  };
}

async function safeTrack(
  promise: Promise<void>,
  eventName: string,
  context: Record<string, unknown>,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    log.warn(`${eventName} telemetry failed`, { ...context, error });
  }
}

export async function emitNotificationScheduledTelemetry(
  context: NotificationTelemetryContext,
): Promise<void> {
  await safeTrack(
    trackNotificationScheduled(context),
    "notification_scheduled",
    {
      notificationType: context.notificationType,
      origin: context.origin,
    },
  );
}

function handleNotificationReceived(notification: Notifications.Notification): void {
  const context = resolveNotificationTelemetryContext(
    notification.request.content.data,
  );
  void safeTrack(
    trackNotificationFired({
      ...context,
      foreground: currentAppState === "active",
    }),
    "notification_fired",
    {
      ...context,
      foreground: currentAppState === "active",
    },
  );
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): void {
  const rawData = response.notification.request.content.data;
  const context = resolveNotificationTelemetryContext(rawData);
  void safeTrack(
    trackNotificationOpened({
      ...context,
      openedFromBackground: currentAppState !== "active",
      actionIdentifier: response.actionIdentifier,
    }),
    "notification_opened",
    {
      ...context,
      actionIdentifier: response.actionIdentifier,
      openedFromBackground: currentAppState !== "active",
    },
  );
}

export function initNotificationTelemetry(): void {
  if (initialized) {
    return;
  }

  initialized = true;
  currentAppState = AppState.currentState;
  appStateSubscription = AppState.addEventListener("change", (nextState) => {
    currentAppState = nextState;
  });
  notificationReceivedSubscription =
    Notifications.addNotificationReceivedListener(handleNotificationReceived);
  notificationResponseSubscription =
    Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );
}

export function stopNotificationTelemetry(): void {
  notificationReceivedSubscription?.remove();
  notificationResponseSubscription?.remove();
  appStateSubscription?.remove();
  notificationReceivedSubscription = null;
  notificationResponseSubscription = null;
  appStateSubscription = null;
  initialized = false;
  currentAppState = AppState.currentState;
}

export function __resetNotificationTelemetryForTests(): void {
  stopNotificationTelemetry();
}
