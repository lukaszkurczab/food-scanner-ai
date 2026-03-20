import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { reconcileAll } from "@/services/notifications/engine";

const mockGetNotificationPlan = jest.fn<
  (uid: string) => Promise<{
    aiStyle: "none" | "concise" | "friendly" | "detailed";
    plans: Array<{
      id: string;
      type: "meal_reminder" | "calorie_goal" | "day_fill";
      enabled: boolean;
      text: string | null;
      time: { hour: number; minute: number };
      days: number[];
      mealKind: "breakfast" | "lunch" | "dinner" | "snack" | null;
      shouldSchedule: boolean;
      missingKcal: number | null;
    }>;
  }>
>();
const mockEnsureAndroidChannel = jest.fn<() => Promise<void>>();
const mockScheduleDailyAt = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockScheduleOneShotAt = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockCancelAllForNotif = jest.fn<(id: string) => Promise<void>>();
const mockNotificationScheduleKey = jest.fn<(uid: string, id: string) => string>();
const mockNextOccurrenceForDays = jest.fn<(...args: unknown[]) => Date | null>();
const mockGetNotificationText = jest.fn();
const mockDebugLog = jest.fn();
const mockRunSystemNotifications = jest.fn<(uid: string) => Promise<void>>();
const mockReconcileReminderScheduling = jest.fn<
  (uid: string) => Promise<{
    outcome: "scheduled" | "cancelled" | "skipped";
    localKey: string | null;
    result: {
      decision: {
        dayKey: string;
        computedAt: string;
        decision: "send" | "suppress" | "noop";
        kind: "log_first_meal" | "log_next_meal" | "complete_day" | null;
        reasonCodes: string[];
        scheduledAtUtc: string | null;
        confidence: number;
        validUntil: string;
      } | null;
      source: "remote" | "fallback" | "disabled";
      status: "live_success" | "invalid_payload" | "disabled" | "service_unavailable" | "no_user";
      enabled: boolean;
      error: unknown | null;
    };
  }>
>();
const mockIsSmartRemindersEnabled = jest.fn<() => boolean>();

jest.mock("@/services/notifications/planService", () => ({
  getNotificationPlan: (uid: string) => mockGetNotificationPlan(uid),
}));

jest.mock("@/services/notifications/localScheduler", () => ({
  ensureAndroidChannel: () => mockEnsureAndroidChannel(),
  scheduleDailyAt: (...args: unknown[]) => mockScheduleDailyAt(...args),
  scheduleOneShotAt: (...args: unknown[]) => mockScheduleOneShotAt(...args),
  cancelAllForNotif: (id: string) => mockCancelAllForNotif(id),
  notificationScheduleKey: (uid: string, id: string) =>
    mockNotificationScheduleKey(uid, id),
  nextOccurrenceForDays: (...args: unknown[]) => mockNextOccurrenceForDays(...args),
}));

jest.mock("@/services/notifications/texts", () => ({
  getNotificationText: (...args: unknown[]) => mockGetNotificationText(...args),
}));

jest.mock("@/services/notifications/system", () => ({
  runSystemNotifications: (uid: string) => mockRunSystemNotifications(uid),
}));

jest.mock("@/services/reminders/reminderScheduling", () => ({
  reconcileReminderScheduling: (uid: string) => mockReconcileReminderScheduling(uid),
}));

jest.mock("@/services/reminders/reminderService", () => ({
  isSmartRemindersEnabled: () => mockIsSmartRemindersEnabled(),
}));

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    language: "pl",
    t: (key: string) => key,
  },
}));

jest.mock("@/utils/debug", () => ({
  debugScope: () => ({
    log: (...args: unknown[]) => mockDebugLog(...args),
    warn: () => undefined,
    error: () => undefined,
    time: () => undefined,
    timeEnd: () => undefined,
    child: () => ({
      log: (...args: unknown[]) => mockDebugLog(...args),
      warn: () => undefined,
      error: () => undefined,
      time: () => undefined,
      timeEnd: () => undefined,
      child: () => {
        throw new Error("child depth exceeded");
      },
    }),
  }),
}));

describe("notifications engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureAndroidChannel.mockResolvedValue(undefined);
    mockScheduleDailyAt.mockResolvedValue(undefined);
    mockScheduleOneShotAt.mockResolvedValue(undefined);
    mockCancelAllForNotif.mockResolvedValue(undefined);
    mockNotificationScheduleKey.mockImplementation((uid, id) => `${uid}:${id}`);
    mockGetNotificationText.mockReturnValue({
      title: "Title",
      body: "Body",
    });
    mockNextOccurrenceForDays.mockReturnValue(new Date("2026-03-03T18:00:00.000Z"));
    mockRunSystemNotifications.mockResolvedValue(undefined);
    mockReconcileReminderScheduling.mockResolvedValue({
      outcome: "cancelled",
      localKey: "user-1:smart-reminder:2026-03-18",
      result: {
        decision: {
          dayKey: "2026-03-18",
          computedAt: "2026-03-18T12:00:00Z",
          decision: "noop",
          kind: null,
          reasonCodes: ["insufficient_signal"],
          scheduledAtUtc: null,
          confidence: 0.65,
          validUntil: "2026-03-18T23:59:59Z",
        },
        source: "remote",
        status: "live_success",
        enabled: true,
        error: null,
      },
    });
    mockIsSmartRemindersEnabled.mockReturnValue(false);
  });

  it("uses backend plan to cancel and schedule notifications", async () => {
    mockGetNotificationPlan.mockResolvedValue({
      aiStyle: "friendly",
      plans: [
        {
          id: "meal-any",
          type: "meal_reminder",
          enabled: true,
          text: null,
          time: { hour: 9, minute: 30 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: null,
        },
        {
          id: "goal",
          type: "calorie_goal",
          enabled: true,
          text: "Custom goal",
          time: { hour: 18, minute: 0 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: 450,
        },
        {
          id: "disabled",
          type: "day_fill",
          enabled: false,
          text: null,
          time: { hour: 20, minute: 0 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: false,
          missingKcal: null,
        },
      ],
    });

    await reconcileAll("user-1");

    expect(mockGetNotificationPlan).toHaveBeenCalledWith("user-1");
    expect(mockCancelAllForNotif).toHaveBeenCalledTimes(3);
    expect(mockNotificationScheduleKey).toHaveBeenCalledWith("user-1", "meal-any");
    expect(mockScheduleDailyAt).toHaveBeenCalledWith(
      9,
      30,
      {
        title: "Title",
        body: "Body",
        data: { notifId: "meal-any", type: "meal_reminder" },
      },
      "user-1:meal-any"
    );
    expect(mockGetNotificationText).toHaveBeenCalledWith(
      "calorie_goal",
      "friendly",
      { missingKcal: 450 },
      "pl"
    );
    expect(mockScheduleOneShotAt).toHaveBeenCalledWith(
      new Date("2026-03-03T18:00:00.000Z"),
      {
        title: "Title",
        body: "Custom goal",
        data: { notifId: "goal", type: "calorie_goal" },
      },
      "user-1:goal"
    );
    expect(mockRunSystemNotifications).toHaveBeenCalledWith("user-1");
    expect(mockReconcileReminderScheduling).not.toHaveBeenCalled();
  });

  it("skips legacy meal/day scheduling when smart reminders are enabled", async () => {
    mockIsSmartRemindersEnabled.mockReturnValue(true);
    mockGetNotificationPlan.mockResolvedValue({
      aiStyle: "friendly",
      plans: [
        {
          id: "meal-any",
          type: "meal_reminder",
          enabled: true,
          text: null,
          time: { hour: 9, minute: 30 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: null,
        },
        {
          id: "fill-day",
          type: "day_fill",
          enabled: true,
          text: null,
          time: { hour: 20, minute: 0 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: null,
        },
        {
          id: "goal",
          type: "calorie_goal",
          enabled: true,
          text: null,
          time: { hour: 18, minute: 0 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: 450,
        },
      ],
    });

    await reconcileAll("user-1");

    expect(mockScheduleDailyAt).not.toHaveBeenCalled();
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);
    expect(mockScheduleOneShotAt).toHaveBeenCalledWith(
      new Date("2026-03-03T18:00:00.000Z"),
      {
        title: "Title",
        body: "Body",
        data: { notifId: "goal", type: "calorie_goal" },
      },
      "user-1:goal"
    );
    expect(mockReconcileReminderScheduling).toHaveBeenCalledWith("user-1");
  });

  it("falls back to legacy meal/day scheduling when smart decision is unavailable", async () => {
    mockIsSmartRemindersEnabled.mockReturnValue(true);
    mockReconcileReminderScheduling.mockResolvedValue({
      outcome: "cancelled",
      localKey: "user-1:smart-reminder:2026-03-18",
      result: {
        decision: null,
        source: "fallback",
        status: "service_unavailable",
        enabled: true,
        error: new Error("backend down"),
      },
    });
    mockGetNotificationPlan.mockResolvedValue({
      aiStyle: "friendly",
      plans: [
        {
          id: "meal-any",
          type: "meal_reminder",
          enabled: true,
          text: null,
          time: { hour: 9, minute: 30 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: null,
        },
        {
          id: "fill-day",
          type: "day_fill",
          enabled: true,
          text: null,
          time: { hour: 20, minute: 0 },
          days: [1, 2, 3],
          mealKind: null,
          shouldSchedule: true,
          missingKcal: null,
        },
      ],
    });

    await reconcileAll("user-1");

    expect(mockScheduleDailyAt).toHaveBeenCalledTimes(1);
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);
    expect(mockReconcileReminderScheduling).toHaveBeenCalledWith("user-1");
  });
});
