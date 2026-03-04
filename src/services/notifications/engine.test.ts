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
const mockNextOccurrenceForDays = jest.fn<(...args: unknown[]) => Date | null>();
const mockGetNotificationText = jest.fn();
const mockDebugLog = jest.fn();

jest.mock("@/services/notifications/planService", () => ({
  getNotificationPlan: (uid: string) => mockGetNotificationPlan(uid),
}));

jest.mock("@/services/notifications/localScheduler", () => ({
  ensureAndroidChannel: () => mockEnsureAndroidChannel(),
  scheduleDailyAt: (...args: unknown[]) => mockScheduleDailyAt(...args),
  scheduleOneShotAt: (...args: unknown[]) => mockScheduleOneShotAt(...args),
  cancelAllForNotif: (id: string) => mockCancelAllForNotif(id),
  nextOccurrenceForDays: (...args: unknown[]) => mockNextOccurrenceForDays(...args),
}));

jest.mock("@/services/notifications/texts", () => ({
  getNotificationText: (...args: unknown[]) => mockGetNotificationText(...args),
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
    mockGetNotificationText.mockReturnValue({
      title: "Title",
      body: "Body",
    });
    mockNextOccurrenceForDays.mockReturnValue(new Date("2026-03-03T18:00:00.000Z"));
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
    expect(mockScheduleDailyAt).toHaveBeenCalledWith(
      9,
      30,
      {
        title: "Title",
        body: "Body",
        data: { notifId: "meal-any", type: "meal_reminder" },
      },
      "meal-any"
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
      "goal"
    );
  });
});
