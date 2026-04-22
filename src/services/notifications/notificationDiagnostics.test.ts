import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetPermissionsAsync = jest.fn<
  () => Promise<{ granted?: boolean; status?: string; canAskAgain?: boolean }>
>();
const mockGetAllScheduledNotificationsAsync = jest.fn<
  () => Promise<Array<{ identifier: string; content: { data?: unknown } }>>
>();
const mockEnsureAndroidChannel = jest.fn<
  () =>
    Promise<{
      platform: "android" | "non-android";
      channelId: string;
      ensured: boolean;
      exists: boolean | null;
      errorMessage: string | null;
    }>
>();

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  getAllScheduledNotificationsAsync: () => mockGetAllScheduledNotificationsAsync(),
}));

jest.mock("@/services/notifications/localScheduler", () => ({
  ensureAndroidChannel: () => mockEnsureAndroidChannel(),
}));

import {
  getAndroidChannelDiagnostics,
  getNotificationEnvironmentDiagnostics,
  getNotificationPermissionDiagnostics,
  getNotificationPermissionRequestState,
  getScheduledNotificationsDiagnostics,
  markNotificationPermissionRequested,
} from "@/services/notifications/notificationDiagnostics";

describe("notificationDiagnostics", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (Constants as { appOwnership?: string }).appOwnership = "standalone";
    (
      Constants as { executionEnvironment?: string }
    ).executionEnvironment = "standalone";
    (Device as { isDevice: boolean }).isDevice = true;
    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      status: "granted",
      canAskAgain: true,
    });
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockEnsureAndroidChannel.mockResolvedValue({
      platform: "android",
      channelId: "default",
      ensured: true,
      exists: true,
      errorMessage: null,
    });
  });

  it("tracks whether notification permission was ever requested", async () => {
    const before = await getNotificationPermissionRequestState();
    expect(before.requested).toBe(false);

    await markNotificationPermissionRequested("2026-04-22T10:00:00Z");

    const after = await getNotificationPermissionRequestState();
    expect(after).toEqual({
      requested: true,
      requestedAt: "2026-04-22T10:00:00Z",
      storageError: null,
    });
  });

  it("combines permission status with request history", async () => {
    await AsyncStorage.setItem(
      "notif:permission:requestedAt",
      "2026-04-22T10:00:00Z",
    );

    const diagnostics = await getNotificationPermissionDiagnostics();

    expect(diagnostics).toEqual({
      status: "granted",
      granted: true,
      canAskAgain: true,
      requested: true,
      requestedAt: "2026-04-22T10:00:00Z",
      errorMessage: null,
    });
  });

  it("returns Android channel diagnostics via scheduler layer", async () => {
    const diagnostics = await getAndroidChannelDiagnostics();

    expect(mockEnsureAndroidChannel).toHaveBeenCalledTimes(1);
    expect(diagnostics.ensured).toBe(true);
    expect(diagnostics.channelId).toBe("default");
  });

  it("classifies scheduled IDs and smart reminder IDs", async () => {
    mockGetAllScheduledNotificationsAsync.mockResolvedValueOnce([
      {
        identifier: "notif-smart-1",
        content: { data: { smartReminder: true } },
      },
      {
        identifier: "notif-system-1",
        content: { data: { origin: "system_notifications" } },
      },
      {
        identifier: "notif-user-1",
        content: { data: { origin: "user_notifications" } },
      },
    ]);

    const diagnostics = await getScheduledNotificationsDiagnostics();

    expect(diagnostics).toEqual({
      totalScheduled: 3,
      allIds: ["notif-smart-1", "notif-system-1", "notif-user-1"],
      smartReminderIds: ["notif-smart-1"],
      errorMessage: null,
    });
  });

  it("marks simulator/emulator as environment-limited", () => {
    (Device as { isDevice: boolean }).isDevice = false;

    const diagnostics = getNotificationEnvironmentDiagnostics();

    expect(diagnostics.releaseSmokeSupported).toBe(false);
    expect(diagnostics.limitationReason).toBe("simulator_or_emulator");
  });

  it("marks Expo Go runtime as environment-limited", () => {
    (Constants as { appOwnership?: string }).appOwnership = "expo";

    const diagnostics = getNotificationEnvironmentDiagnostics();

    expect(diagnostics.releaseSmokeSupported).toBe(false);
    expect(diagnostics.limitationReason).toBe("expo_go_runtime");
  });
});
