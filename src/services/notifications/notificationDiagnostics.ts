import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { isRecord } from "@/services/contracts/guards";
import {
  ensureAndroidChannel,
  type AndroidChannelEnsureResult,
} from "@/services/notifications/localScheduler";

const PERMISSION_REQUESTED_AT_KEY = "notif:permission:requestedAt";

export type NotificationPermissionRequestState = {
  requested: boolean;
  requestedAt: string | null;
  storageError: string | null;
};

export type NotificationPermissionDiagnostics = {
  status: string;
  granted: boolean;
  canAskAgain: boolean | null;
  requested: boolean;
  requestedAt: string | null;
  errorMessage: string | null;
};

export type ScheduledNotificationsDiagnostics = {
  totalScheduled: number;
  allIds: string[];
  smartReminderIds: string[];
  errorMessage: string | null;
};

export type NotificationEnvironmentDiagnostics = {
  platform: typeof Platform.OS;
  isPhysicalDevice: boolean;
  appOwnership: string;
  executionEnvironment: string;
  releaseSmokeSupported: boolean;
  limitationReason: string | null;
};

function resolvePermissionStatus(
  permission: Notifications.NotificationPermissionsStatus,
): string {
  const statusValue = (permission as { status?: unknown }).status;
  return typeof statusValue === "string" ? statusValue : "unknown";
}

function resolvePermissionGranted(
  permission: Notifications.NotificationPermissionsStatus,
): boolean {
  const granted = (permission as { granted?: unknown }).granted;
  return granted === true || resolvePermissionStatus(permission) === "granted";
}

function resolveCanAskAgain(
  permission: Notifications.NotificationPermissionsStatus,
): boolean | null {
  const value = (permission as { canAskAgain?: unknown }).canAskAgain;
  return typeof value === "boolean" ? value : null;
}

export async function markNotificationPermissionRequested(
  requestedAt: string = new Date().toISOString(),
): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_REQUESTED_AT_KEY, requestedAt);
  } catch {
    // Diagnostics metadata must not break permission flow.
  }
}

export async function getNotificationPermissionRequestState(): Promise<NotificationPermissionRequestState> {
  try {
    const requestedAt = await AsyncStorage.getItem(PERMISSION_REQUESTED_AT_KEY);
    return {
      requested: typeof requestedAt === "string" && requestedAt.trim().length > 0,
      requestedAt:
        typeof requestedAt === "string" && requestedAt.trim().length > 0
          ? requestedAt
          : null,
      storageError: null,
    };
  } catch (error) {
    return {
      requested: false,
      requestedAt: null,
      storageError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getNotificationPermissionDiagnostics(): Promise<NotificationPermissionDiagnostics> {
  const requestState = await getNotificationPermissionRequestState();

  try {
    const permission = await Notifications.getPermissionsAsync();
    return {
      status: resolvePermissionStatus(permission),
      granted: resolvePermissionGranted(permission),
      canAskAgain: resolveCanAskAgain(permission),
      requested: requestState.requested,
      requestedAt: requestState.requestedAt,
      errorMessage: requestState.storageError,
    };
  } catch (error) {
    return {
      status: "unknown",
      granted: false,
      canAskAgain: null,
      requested: requestState.requested,
      requestedAt: requestState.requestedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getAndroidChannelDiagnostics(): Promise<AndroidChannelEnsureResult> {
  return ensureAndroidChannel();
}

export async function getScheduledNotificationsDiagnostics(): Promise<ScheduledNotificationsDiagnostics> {
  const getAll = (
    Notifications as unknown as {
      getAllScheduledNotificationsAsync?: () => Promise<
        Array<{
          identifier: string;
          content: { data?: unknown };
        }>
      >;
    }
  ).getAllScheduledNotificationsAsync;

  if (typeof getAll !== "function") {
    return {
      totalScheduled: 0,
      allIds: [],
      smartReminderIds: [],
      errorMessage: "scheduled_notifications_api_unavailable",
    };
  }

  try {
    const scheduled = await getAll();
    const allIds = scheduled.map((request) => request.identifier);
    const smartReminderIds = scheduled
      .filter((request) => {
        const data = request.content?.data;
        return isRecord(data) && data.smartReminder === true;
      })
      .map((request) => request.identifier);

    return {
      totalScheduled: allIds.length,
      allIds,
      smartReminderIds,
      errorMessage: null,
    };
  } catch (error) {
    return {
      totalScheduled: 0,
      allIds: [],
      smartReminderIds: [],
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function getNotificationEnvironmentDiagnostics(): NotificationEnvironmentDiagnostics {
  const appOwnership = normalizeString(Constants.appOwnership, "unknown");
  const executionEnvironment = normalizeString(
    (Constants as { executionEnvironment?: unknown }).executionEnvironment,
    "unknown",
  );
  const isPhysicalDevice = Device.isDevice === true;
  const isExpoGo = appOwnership === "expo";

  if (!isPhysicalDevice) {
    return {
      platform: Platform.OS,
      isPhysicalDevice,
      appOwnership,
      executionEnvironment,
      releaseSmokeSupported: false,
      limitationReason: "simulator_or_emulator",
    };
  }

  if (isExpoGo) {
    return {
      platform: Platform.OS,
      isPhysicalDevice,
      appOwnership,
      executionEnvironment,
      releaseSmokeSupported: false,
      limitationReason: "expo_go_runtime",
    };
  }

  return {
    platform: Platform.OS,
    isPhysicalDevice,
    appOwnership,
    executionEnvironment,
    releaseSmokeSupported: true,
    limitationReason: null,
  };
}
