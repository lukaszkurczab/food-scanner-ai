import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockScheduleNotificationAsync = jest.fn<
  (input: unknown) => Promise<string>
>();
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();
const mockEmitNotificationScheduledTelemetry = jest.fn<
  (context: { notificationType?: string | null; origin?: string | null }) => Promise<void>
>();

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: (input: unknown) => mockScheduleNotificationAsync(input),
  SchedulableTriggerInputTypes: {
    DATE: "date",
    DAILY: "daily",
    CALENDAR: "calendar",
  },
  AndroidImportance: { HIGH: "high" },
  AndroidNotificationVisibility: { PUBLIC: "public" },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    select: <T,>(value: { ios?: T; android?: T }) => value.ios,
  },
}));

jest.mock("@/services/notifications/notificationTelemetry", () => ({
  emitNotificationScheduledTelemetry: (context: {
    notificationType?: string | null;
    origin?: string | null;
  }) => mockEmitNotificationScheduledTelemetry(context),
}));

describe("localScheduler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleNotificationAsync.mockResolvedValue("notif-1");
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockEmitNotificationScheduledTelemetry.mockResolvedValue(undefined);
  });

  it("emits a telemetry event when a notification is scheduled", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localScheduler = require("@/services/notifications/localScheduler") as typeof import("@/services/notifications/localScheduler");

    await localScheduler.scheduleOneShotAt(
      new Date("2026-03-18T10:00:00.000Z"),
      {
        title: "Title",
        body: "Body",
        data: { notifId: "n-1", type: "day_fill" },
      },
      "user-1:n-1",
    );

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: expect.objectContaining({
            notifId: "n-1",
            type: "day_fill",
            origin: "user_notifications",
          }),
        }),
      }),
    );
    expect(mockEmitNotificationScheduledTelemetry).toHaveBeenCalledWith({
      notificationType: "day_fill",
      origin: "user_notifications",
    });
  });

  it("preserves explicit system origin for smart reminder scheduling", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localScheduler = require("@/services/notifications/localScheduler") as typeof import("@/services/notifications/localScheduler");

    await localScheduler.scheduleOneShotAt(
      new Date("2026-03-18T18:30:00.000Z"),
      {
        title: "Title",
        body: "Body",
        data: {
          type: "meal_reminder",
          origin: "system_notifications",
          smartReminder: true,
          reminderKind: "log_next_meal",
        },
      },
      "user-1:smart-reminder:2026-03-18",
    );

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: expect.objectContaining({
            type: "meal_reminder",
            origin: "system_notifications",
            smartReminder: true,
            reminderKind: "log_next_meal",
          }),
        }),
      }),
    );
    expect(mockEmitNotificationScheduledTelemetry).toHaveBeenCalledWith({
      notificationType: "meal_reminder",
      origin: "system_notifications",
    });
  });
});
