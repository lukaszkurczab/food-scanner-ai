import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockScheduleNotificationAsync = jest.fn<
  (input: unknown) => Promise<string>
>();
const mockSetNotificationChannelAsync = jest.fn<
  (id: string, payload: unknown) => Promise<void>
>();
const mockGetNotificationChannelAsync = jest.fn<
  (id: string) => Promise<unknown>
>();
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();
const mockEmitNotificationScheduledTelemetry = jest.fn<
  (context: { notificationType?: string | null; origin?: string | null }) => Promise<void>
>();

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: (input: unknown) => mockScheduleNotificationAsync(input),
  setNotificationChannelAsync: (id: string, payload: unknown) =>
    mockSetNotificationChannelAsync(id, payload),
  getNotificationChannelAsync: (id: string) => mockGetNotificationChannelAsync(id),
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
    OS: "android",
    select: <T,>(value: { ios?: T; android?: T }) => value.android,
  },
}));

jest.mock("@/services/notifications/notificationTelemetry", () => ({
  emitNotificationScheduledTelemetry: (context: {
    notificationType?: string | null;
    origin?: string | null;
  }) => mockEmitNotificationScheduledTelemetry(context),
}));

describe("localScheduler (android)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleNotificationAsync.mockResolvedValue("notif-1");
    mockSetNotificationChannelAsync.mockResolvedValue(undefined);
    mockGetNotificationChannelAsync.mockResolvedValue({ id: "default" });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockEmitNotificationScheduledTelemetry.mockResolvedValue(undefined);
  });

  it("ensures Android channel before scheduling a one-shot notification", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const localScheduler = require("@/services/notifications/localScheduler") as typeof import("@/services/notifications/localScheduler");

    await localScheduler.scheduleOneShotAt(
      new Date("2026-03-18T10:00:00.000Z"),
      {
        title: "Title",
        body: "Body",
        data: { type: "meal_reminder", origin: "system_notifications" },
      },
      "user-1:smart-reminder:2026-03-18",
    );

    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      "default",
      expect.objectContaining({ name: "General" }),
    );
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          channelId: "default",
        }),
      }),
    );
  });
});
