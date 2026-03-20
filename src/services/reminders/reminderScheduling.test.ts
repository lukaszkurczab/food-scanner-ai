import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReminderDecisionResult } from "@/services/reminders/reminderTypes";
import type { AIStyle, MealKind, NotificationType } from "@/types/notification";

const asyncStorageState = new Map<string, string>();
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();
const mockRemoveItem = jest.fn<(key: string) => Promise<void>>();
const mockGetAllKeys = jest.fn<() => Promise<string[]>>();
const mockGetReminderDecision = jest.fn<
  (
    uid: string,
    options?: { dayKey?: string | null },
  ) => Promise<ReminderDecisionResult>
>();
const mockScheduleOneShotAt = jest.fn<(when: Date, content: unknown, localKey: string) => Promise<void>>();
const mockCancelAllForNotif = jest.fn<(localKey: string) => Promise<void>>();
const mockNotificationScheduleKey = jest.fn<(uid: string, id: string) => string>();
const mockGetNotificationText = jest.fn();
const mockDebugLog = jest.fn();
const mockDebugWarn = jest.fn();
const mockRunSystemNotifications = jest.fn<(uid: string) => Promise<void>>();
const mockTrackSmartReminderNoop = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderScheduleFailed = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderScheduled = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderSuppressed = jest.fn<() => Promise<void>>();
const mockGetPermissionsAsync = jest.fn<() => Promise<{ granted: boolean }>>();

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockGetPermissionsAsync(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
    removeItem: (key: string) => mockRemoveItem(key),
    getAllKeys: () => mockGetAllKeys(),
  },
}));

jest.mock("@/services/reminders/reminderService", () => ({
  getReminderDecision: (
    uid: string,
    options?: { dayKey?: string | null },
  ) => mockGetReminderDecision(uid, options),
  getCurrentReminderDecisionDayKey: (now?: Date) => {
    const date = now ?? new Date("2026-03-18T12:00:00.000Z");
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },
  isSmartRemindersEnabled: () => true,
}));

jest.mock("@/services/notifications/localScheduler", () => ({
  scheduleOneShotAt: (when: Date, content: unknown, localKey: string) =>
    mockScheduleOneShotAt(when, content, localKey),
  cancelAllForNotif: (localKey: string) => mockCancelAllForNotif(localKey),
  notificationScheduleKey: (uid: string, id: string) =>
    mockNotificationScheduleKey(uid, id),
}));

jest.mock("@/services/notifications/texts", () => ({
  getNotificationText: (...args: unknown[]) => mockGetNotificationText(...args),
}));

jest.mock("@/services/notifications/system", () => ({
  runSystemNotifications: (uid: string) => mockRunSystemNotifications(uid),
}));

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  toSmartReminderConfidenceBucket: (confidence: number) => {
    if (confidence >= 0.8) return "high";
    if (confidence >= 0.5) return "medium";
    return "low";
  },
  toSmartReminderScheduledWindow: (localMinuteOfDay: number) => {
    if (localMinuteOfDay < 360) return "overnight";
    if (localMinuteOfDay < 720) return "morning";
    if (localMinuteOfDay < 1020) return "afternoon";
    if (localMinuteOfDay < 1260) return "evening";
    return "late_evening";
  },
  trackSmartReminderNoop: () => mockTrackSmartReminderNoop(),
  trackSmartReminderScheduleFailed: () => mockTrackSmartReminderScheduleFailed(),
  trackSmartReminderScheduled: () => mockTrackSmartReminderScheduled(),
  trackSmartReminderSuppressed: () => mockTrackSmartReminderSuppressed(),
}));

jest.mock("@/utils/debug", () => ({
  debugScope: () => ({
    log: (...args: unknown[]) => mockDebugLog(...args),
    warn: (...args: unknown[]) => mockDebugWarn(...args),
    error: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    child: () => ({
      log: (...args: unknown[]) => mockDebugLog(...args),
      warn: (...args: unknown[]) => mockDebugWarn(...args),
      error: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      child: jest.fn(),
    }),
  }),
}));

describe("reminderScheduling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asyncStorageState.clear();
    mockGetItem.mockImplementation(async (key) => asyncStorageState.get(key) ?? null);
    mockSetItem.mockImplementation(async (key, value) => {
      asyncStorageState.set(key, value);
    });
    mockRemoveItem.mockImplementation(async (key) => {
      asyncStorageState.delete(key);
    });
    mockGetAllKeys.mockResolvedValue([]);
    mockGetPermissionsAsync.mockResolvedValue({ granted: true });
    mockScheduleOneShotAt.mockResolvedValue(undefined);
    mockCancelAllForNotif.mockResolvedValue(undefined);
    mockNotificationScheduleKey.mockImplementation((uid, id) => `${uid}:${id}`);
    mockGetNotificationText.mockReturnValue({
      title: "Title",
      body: "Body",
    });
    mockTrackSmartReminderNoop.mockResolvedValue(undefined);
    mockTrackSmartReminderScheduleFailed.mockResolvedValue(undefined);
    mockTrackSmartReminderScheduled.mockResolvedValue(undefined);
    mockTrackSmartReminderSuppressed.mockResolvedValue(undefined);
  });

  it("schedules a smart reminder when decision=send", async () => {
    const now = new Date("2026-03-18T18:00:00.000Z");
    const expectedWhen = new Date("2026-03-18T18:30:00.000Z");

    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: [
          "preferred_window_open",
          "day_partially_logged",
          "logging_usually_happens_now",
        ],
        scheduledAtUtc: "2026-03-18T18:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-18T19:30:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
      now,
    });

    expect(result.outcome).toBe("scheduled");
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockScheduleOneShotAt).toHaveBeenCalledWith(
      expectedWhen,
      {
        title: "Title",
        body: "Body",
        data: {
          type: "meal_reminder",
          origin: "system_notifications",
          smartReminder: true,
          reminderKind: "log_next_meal",
          dayKey: "2026-03-18",
          scheduledWindow: "evening",
        },
      },
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockTrackSmartReminderScheduled).toHaveBeenCalled();
    expect(
      asyncStorageState.get("smart-reminder:decision:user-1:2026-03-18"),
    ).toContain("\"decision\":\"send\"");
  });

  it("cancels any already-scheduled reminder when decision=suppress", async () => {
    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "suppress",
        kind: null,
        reasonCodes: ["quiet_hours"],
        scheduledAtUtc: null,
        confidence: 1,
        validUntil: "2026-03-18T22:00:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
    });

    expect(result.outcome).toBe("cancelled");
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(mockTrackSmartReminderSuppressed).toHaveBeenCalled();
  });

  it("cancels any already-scheduled reminder when decision=noop", async () => {
    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "noop",
        kind: null,
        reasonCodes: ["insufficient_signal"],
        scheduledAtUtc: null,
        confidence: 0.7,
        validUntil: "2026-03-18T23:59:59Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
    });

    expect(result.outcome).toBe("cancelled");
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(mockTrackSmartReminderNoop).toHaveBeenCalled();
  });

  it("does not schedule on failure or invalid payload semantics", async () => {
    asyncStorageState.set(
      "smart-reminder:decision:user-1:2026-03-18",
      JSON.stringify({
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: ["preferred_window_open"],
        scheduledAtUtc: "2026-03-18T18:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-18T19:30:00Z",
      }),
    );
    mockGetReminderDecision.mockResolvedValue({
      decision: null,
      source: "fallback",
      status: "invalid_payload",
      enabled: true,
      error: new Error("contract drift"),
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
    });

    expect(result.outcome).toBe("cancelled");
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(
      asyncStorageState.has("smart-reminder:decision:user-1:2026-03-18"),
    ).toBe(false);
  });

  it("cancels cached send when backend is temporarily unavailable", async () => {
    asyncStorageState.set(
      "smart-reminder:decision:user-1:2026-03-18",
      JSON.stringify({
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: ["preferred_window_open"],
        scheduledAtUtc: "2026-03-18T18:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-18T19:30:00Z",
      }),
    );
    mockGetReminderDecision.mockResolvedValue({
      decision: null,
      source: "fallback",
      status: "service_unavailable",
      enabled: true,
      error: new Error("temporary backend outage"),
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
      now: new Date("2026-03-18T18:15:00.000Z"),
    });

    expect(result.outcome).toBe("cancelled");
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(
      asyncStorageState.has("smart-reminder:decision:user-1:2026-03-18"),
    ).toBe(false);
  });

  it("does not schedule when device notification permission is unavailable", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false });
    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: [
          "habit_window_match",
          "day_partially_logged",
          "logging_usually_happens_now",
        ],
        scheduledAtUtc: "2026-03-18T18:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-18T19:30:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
    });

    expect(result.outcome).toBe("cancelled");
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(mockTrackSmartReminderScheduled).not.toHaveBeenCalled();
    expect(mockTrackSmartReminderScheduleFailed).toHaveBeenCalled();
  });

  it("maps complete_day reminders onto the existing day_fill notification type", async () => {
    const now = new Date("2026-03-18T18:00:00.000Z");

    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "complete_day",
        reasonCodes: [
          "preferred_window_open",
          "habit_window_match",
          "day_partially_logged",
          "logging_usually_happens_now",
        ],
        scheduledAtUtc: "2026-03-18T20:00:00Z",
        confidence: 0.8,
        validUntil: "2026-03-18T21:00:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
      now,
    });

    expect(mockGetNotificationText).toHaveBeenCalledWith("day_fill", "friendly");
    expect(mockScheduleOneShotAt).toHaveBeenCalledWith(
      expect.any(Date),
      expect.objectContaining({
        data: expect.objectContaining({
          type: "day_fill",
          origin: "system_notifications",
          reminderKind: "complete_day",
        }),
      }),
      "user-1:smart-reminder:2026-03-18",
    );
  });

  it("schedules from canonical UTC even when dayKey and UTC date differ", async () => {
    const expectedWhen = new Date("2026-03-19T00:30:00.000Z");

    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T23:50:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: [
          "preferred_window_open",
          "day_partially_logged",
          "logging_usually_happens_now",
        ],
        scheduledAtUtc: "2026-03-19T00:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-19T01:00:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
      now: new Date("2026-03-18T23:55:00.000Z"),
    });

    expect(mockScheduleOneShotAt).toHaveBeenCalledWith(
      expectedWhen,
      expect.any(Object),
      "user-1:smart-reminder:2026-03-18",
    );
  });

  it("cancels all stored smart reminder keys for the previous user", async () => {
    mockGetAllKeys.mockResolvedValue([
      "notif:ids:user-1:smart-reminder:2026-03-18",
      "notif:ids:user-1:smart-reminder:2026-03-19",
      "notif:ids:user-1:goal",
      "notif:ids:user-2:smart-reminder:2026-03-18",
    ]);

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    await service.cancelAllReminderScheduling("user-1");

    expect(mockCancelAllForNotif).toHaveBeenCalledTimes(2);
    expect(mockCancelAllForNotif).toHaveBeenNthCalledWith(
      1,
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockCancelAllForNotif).toHaveBeenNthCalledWith(
      2,
      "user-1:smart-reminder:2026-03-19",
    );
  });

  it("tracks scheduling failure when local scheduler throws", async () => {
    mockScheduleOneShotAt.mockRejectedValueOnce(new Error("schedule broke"));
    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: [
          "preferred_window_open",
          "day_partially_logged",
          "logging_usually_happens_now",
        ],
        scheduledAtUtc: "2026-03-18T18:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-18T19:30:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const service =
      jest.requireActual("@/services/reminders/reminderScheduling") as typeof import("@/services/reminders/reminderScheduling");

    const result = await service.reconcileReminderScheduling("user-1", {
      dayKey: "2026-03-18",
      now: new Date("2026-03-18T18:00:00.000Z"),
    });

    expect(result.outcome).toBe("cancelled");
    expect(mockTrackSmartReminderScheduleFailed).toHaveBeenCalled();
    expect(mockTrackSmartReminderScheduled).not.toHaveBeenCalled();
  });
});

describe("notifications engine integration", () => {
  const mockGetNotificationPlan = jest.fn<
    (uid: string) => Promise<{
      aiStyle: AIStyle;
      plans: Array<{
        id: string;
        type: NotificationType;
        enabled: boolean;
        text: string | null;
        time: { hour: number; minute: number };
        days: number[];
        mealKind: MealKind | null;
        shouldSchedule: boolean;
        missingKcal: number | null;
      }>;
    }>
  >();
  const mockEnsureAndroidChannel = jest.fn<() => Promise<void>>();
  const mockLocalCancelAllForNotif = jest.fn<(id: string) => Promise<void>>();
  const mockLocalScheduleDailyAt = jest.fn<(...args: unknown[]) => Promise<void>>();
  const mockLocalScheduleOneShotAt = jest.fn<(...args: unknown[]) => Promise<void>>();
  const mockLocalNotificationScheduleKey = jest.fn<(uid: string, id: string) => string>();
  const mockLocalNextOccurrenceForDays = jest.fn<(...args: unknown[]) => Date | null>();
  const mockTexts = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    asyncStorageState.clear();
    mockEnsureAndroidChannel.mockResolvedValue(undefined);
    mockGetNotificationPlan.mockResolvedValue({ aiStyle: "friendly", plans: [] });
    mockLocalCancelAllForNotif.mockResolvedValue(undefined);
    mockLocalScheduleDailyAt.mockResolvedValue(undefined);
    mockLocalScheduleOneShotAt.mockResolvedValue(undefined);
    mockLocalNotificationScheduleKey.mockImplementation((uid, id) => `${uid}:${id}`);
    mockLocalNextOccurrenceForDays.mockReturnValue(new Date("2026-03-03T18:00:00.000Z"));
    mockTexts.mockReturnValue({ title: "Title", body: "Body" });
    mockRunSystemNotifications.mockResolvedValue(undefined);
    mockGetItem.mockImplementation(async (key) => asyncStorageState.get(key) ?? null);
    mockSetItem.mockImplementation(async (key, value) => {
      asyncStorageState.set(key, value);
    });
    mockRemoveItem.mockImplementation(async (key) => {
      asyncStorageState.delete(key);
    });

    jest.doMock("@/services/notifications/planService", () => ({
      getNotificationPlan: (uid: string) => mockGetNotificationPlan(uid),
    }));
    jest.doMock("@/services/notifications/localScheduler", () => ({
      ensureAndroidChannel: () => mockEnsureAndroidChannel(),
      scheduleDailyAt: (...args: unknown[]) => mockLocalScheduleDailyAt(...args),
      scheduleOneShotAt: (...args: unknown[]) => mockLocalScheduleOneShotAt(...args),
      cancelAllForNotif: (id: string) => mockLocalCancelAllForNotif(id),
      notificationScheduleKey: (uid: string, id: string) =>
        mockLocalNotificationScheduleKey(uid, id),
      nextOccurrenceForDays: (...args: unknown[]) => mockLocalNextOccurrenceForDays(...args),
    }));
    jest.doMock("@/services/notifications/texts", () => ({
      getNotificationText: (...args: unknown[]) => mockTexts(...args),
    }));
    jest.doMock("@/i18n", () => ({
      __esModule: true,
      default: {
        language: "pl",
        t: (key: string) => key,
      },
    }));
    jest.doMock("@/services/notifications/system", () => ({
      runSystemNotifications: (uid: string) => mockRunSystemNotifications(uid),
    }));
    jest.doMock("@/services/reminders/reminderService", () => ({
      isSmartRemindersEnabled: () => true,
    }));
  });

  it("reconcileAll also runs system notifications so smart reminders enter the scheduling flow", async () => {
    const engine =
      jest.requireActual("@/services/notifications/engine") as typeof import("@/services/notifications/engine");

    await engine.reconcileAll("user-1");

    expect(mockRunSystemNotifications).toHaveBeenCalledWith("user-1");
  });
});
