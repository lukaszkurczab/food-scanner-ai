import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockTrackNotificationFired = jest.fn<
  (input: Record<string, unknown>) => Promise<void>
>();
const mockTrackNotificationOpened = jest.fn<
  (input: Record<string, unknown>) => Promise<void>
>();
const mockTrackNotificationScheduled = jest.fn<
  (input: Record<string, unknown>) => Promise<void>
>();
const mockWarn = jest.fn<(...args: unknown[]) => void>();

let mockNotificationReceivedListener: ((notification: {
  request: { content: { data?: unknown } };
}) => void) | null = null;
let mockNotificationResponseListener: ((response: {
  actionIdentifier?: string;
  notification: { request: { content: { data?: unknown } } };
}) => void) | null = null;
let mockAppStateChangeListener: ((state: "active" | "background" | "inactive") => void) | null =
  null;

const mockReceivedSubscription = { remove: jest.fn() };
const mockResponseSubscription = { remove: jest.fn() };
const mockAppStateSubscription = { remove: jest.fn() };

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackNotificationFired: (input: Record<string, unknown>) =>
    mockTrackNotificationFired(input),
  trackNotificationOpened: (input: Record<string, unknown>) =>
    mockTrackNotificationOpened(input),
  trackNotificationScheduled: (input: Record<string, unknown>) =>
    mockTrackNotificationScheduled(input),
}));

jest.mock("expo-notifications", () => ({
  addNotificationReceivedListener: (
    listener: (notification: { request: { content: { data?: unknown } } }) => void,
  ) => {
    mockNotificationReceivedListener = listener;
    return mockReceivedSubscription;
  },
  addNotificationResponseReceivedListener: (
    listener: (response: {
      actionIdentifier?: string;
      notification: { request: { content: { data?: unknown } } };
    }) => void,
  ) => {
    mockNotificationResponseListener = listener;
    return mockResponseSubscription;
  },
}));

jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (
      _event: "change",
      listener: (state: "active" | "background" | "inactive") => void,
    ) => {
      mockAppStateChangeListener = listener;
      return mockAppStateSubscription;
    },
  },
}));

jest.mock("@/utils/debug", () => ({
  debugScope: () => ({
    log: jest.fn(),
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    child: () => ({
      log: jest.fn(),
      warn: (...args: unknown[]) => mockWarn(...args),
      error: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      child: jest.fn(),
    }),
  }),
}));

describe("notificationTelemetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationReceivedListener = null;
    mockNotificationResponseListener = null;
    mockAppStateChangeListener = null;
    mockTrackNotificationFired.mockResolvedValue(undefined);
    mockTrackNotificationOpened.mockResolvedValue(undefined);
    mockTrackNotificationScheduled.mockResolvedValue(undefined);
  });

  it("tracks notification fired and opened events from Expo listeners", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require("@/services/notifications/notificationTelemetry") as typeof import("@/services/notifications/notificationTelemetry");

    service.initNotificationTelemetry();
    mockNotificationReceivedListener?.({
      request: {
        content: {
          data: { type: "meal_reminder", source: "user_notifications" },
        },
      },
    });

    mockAppStateChangeListener?.("background");
    mockNotificationResponseListener?.({
      actionIdentifier: "DEFAULT",
      notification: {
        request: {
          content: {
            data: { sys: "stats_weekly_summary", source: "system_notifications" },
          },
        },
      },
    });

    await Promise.resolve();

    expect(mockTrackNotificationFired).toHaveBeenCalledWith({
      notificationType: "meal_reminder",
      source: "user_notifications",
      foreground: true,
    });
    expect(mockTrackNotificationOpened).toHaveBeenCalledWith({
      notificationType: "stats_weekly_summary",
      source: "system_notifications",
      openedFromBackground: true,
      actionIdentifier: "DEFAULT",
    });
  });

  it("cleans up listeners on stop", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const service = require("@/services/notifications/notificationTelemetry") as typeof import("@/services/notifications/notificationTelemetry");

    service.initNotificationTelemetry();
    service.stopNotificationTelemetry();

    expect(mockReceivedSubscription.remove).toHaveBeenCalled();
    expect(mockResponseSubscription.remove).toHaveBeenCalled();
    expect(mockAppStateSubscription.remove).toHaveBeenCalled();
  });
});
