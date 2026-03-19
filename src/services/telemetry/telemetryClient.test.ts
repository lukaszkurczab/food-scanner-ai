import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockPost = jest.fn<(path: string, data?: unknown, options?: unknown) => Promise<unknown>>();
const mockReadPublicEnv = jest.fn<(name: string) => string | undefined>();
const mockNetInfoFetch = jest.fn<
  () => Promise<{ isConnected: boolean | null; isInternetReachable?: boolean | null }>
>();
const mockGetLocales = jest.fn<() => Array<{ languageTag?: string }>>();

jest.mock("@/services/core/apiClient", () => ({
  post: (path: string, data?: unknown, options?: unknown) =>
    mockPost(path, data, options),
}));

jest.mock("@/services/core/publicEnv", () => ({
  readPublicEnv: (name: string) => mockReadPublicEnv(name),
}));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: () => mockNetInfoFetch(),
  },
}));

jest.mock("expo-localization", () => ({
  getLocales: () => mockGetLocales(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { version: "1.0.1", extra: {} },
    nativeBuildVersion: "45",
  },
}));

describe("telemetryClient", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_ENABLE_TELEMETRY") {
        return "true";
      }
      return undefined;
    });
    mockNetInfoFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    mockGetLocales.mockReturnValue([{ languageTag: "pl-PL" }]);
    mockPost.mockResolvedValue({
      acceptedCount: 1,
      duplicateCount: 0,
      rejectedCount: 0,
      rejectedEvents: [],
    });
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");
    telemetryClient.stopTelemetryClient();
    telemetryClient.__resetTelemetryClientForTests();
    await AsyncStorage.clear();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("enqueues tracked events into the buffered queue", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    await telemetryClient.track("meal_added", { mealInputMethod: "photo" });

    const raw = await AsyncStorage.getItem(
      telemetryClient.TELEMETRY_BUFFER_STORAGE_KEY,
    );
    const payload = JSON.parse(raw || "{}") as {
      sessionId?: string;
      events?: Array<{ name?: string; props?: { mealInputMethod?: string } }>;
    };

    expect(payload.sessionId).toEqual(expect.any(String));
    expect(payload.events).toHaveLength(1);
    expect(payload.events?.[0]).toMatchObject({
      name: "meal_added",
      props: { mealInputMethod: "photo" },
    });
  });

  it("deduplicates buffered events by eventId when restoring persisted queue", async () => {
    const duplicateEvent = {
      eventId: "evt-1",
      name: "meal_added",
      ts: "2026-03-18T12:00:00.000Z",
      props: { mealInputMethod: "photo" },
    };

    await AsyncStorage.setItem(
      "telemetry:buffer:v1",
      JSON.stringify({
        sessionId: "sess-1",
        events: [duplicateEvent, duplicateEvent],
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    await telemetryClient.initTelemetryClient();
    await telemetryClient.flush();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0]?.[1]).toMatchObject({
      sessionId: "sess-1",
      events: [duplicateEvent],
    });
  });

  it("flushes a batch immediately when the queue reaches the batch limit", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    for (let index = 0; index < 50; index += 1) {
      await telemetryClient.track("meal_added", { batchIndex: index });
    }

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0]?.[0]).toBe("/api/v2/telemetry/events/batch");
    expect(
      (mockPost.mock.calls[0]?.[1] as { events?: unknown[] } | undefined)?.events,
    ).toHaveLength(50);
  });

  it("retries flushing after backoff when a send attempt fails", async () => {
    mockPost
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        acceptedCount: 1,
        duplicateCount: 0,
        rejectedCount: 0,
        rejectedEvents: [],
      });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    await telemetryClient.track("meal_added");
    await telemetryClient.flush();
    await telemetryClient.flush();

    expect(mockPost).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2_000);
    await telemetryClient.flush();

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(
      await AsyncStorage.getItem(telemetryClient.TELEMETRY_BUFFER_STORAGE_KEY),
    ).toBeNull();
  });

  it("drops a batch permanently when the backend rejects it with a non-retryable 4xx", async () => {
    const error = Object.assign(new Error("invalid telemetry payload"), {
      status: 422,
      retryable: false,
    });
    mockPost.mockRejectedValueOnce(error);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    await telemetryClient.track("screen_view", { screen: "home" });
    await telemetryClient.flush();

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(
      await AsyncStorage.getItem(telemetryClient.TELEMETRY_BUFFER_STORAGE_KEY),
    ).toBeNull();
  });

  it("is a graceful no-op for notification telemetry when telemetry is disabled", async () => {
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_ENABLE_TELEMETRY") {
        return "false";
      }
      return undefined;
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    await telemetryClient.initTelemetryClient();
    await telemetryClient.track("notification_opened", {
      notificationType: "day_fill",
      origin: "user_notifications",
    });
    await telemetryClient.flush();

    expect(mockPost).not.toHaveBeenCalled();
    expect(
      await AsyncStorage.getItem(telemetryClient.TELEMETRY_BUFFER_STORAGE_KEY),
    ).toBeNull();
  });

  it("restores buffered queue from AsyncStorage and flushes it on demand", async () => {
    await AsyncStorage.setItem(
      "telemetry:buffer:v1",
      JSON.stringify({
        sessionId: "sess-restored",
        events: [
          {
            eventId: "evt-restored",
            name: "screen_view",
            ts: "2026-03-18T12:00:00.000Z",
            props: { screen: "home" },
          },
        ],
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetryClient = require("@/services/telemetry/telemetryClient") as typeof import("@/services/telemetry/telemetryClient");

    await telemetryClient.initTelemetryClient();
    await telemetryClient.flush();

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v2/telemetry/events/batch",
      expect.objectContaining({
        sessionId: "sess-restored",
        app: {
          platform: expect.any(String),
          appVersion: "1.0.1",
          build: "45",
        },
        device: {
          locale: "pl-PL",
          tzOffsetMin: expect.any(Number),
        },
        events: [
          expect.objectContaining({
            eventId: "evt-restored",
            name: "screen_view",
          }),
        ],
      }),
      { timeout: 15_000 },
    );
  });
});
