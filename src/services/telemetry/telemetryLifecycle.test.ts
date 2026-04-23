import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockTrackSessionStart = jest.fn<() => Promise<void>>();
const mockFlush = jest.fn<() => Promise<void>>();

let mockAppStateChangeListener:
  | ((state: "active" | "background" | "inactive") => void)
  | null = null;

const mockAppStateSubscription = { remove: jest.fn() };

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackSessionStart: () => mockTrackSessionStart(),
}));

jest.mock("@/services/telemetry/telemetryClient", () => ({
  flush: () => mockFlush(),
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

describe("telemetryLifecycle", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lifecycle = require("@/services/telemetry/telemetryLifecycle") as typeof import("@/services/telemetry/telemetryLifecycle");
    lifecycle.__resetTelemetryLifecycleForTests();
    jest.clearAllMocks();
    mockAppStateChangeListener = null;
    mockTrackSessionStart.mockResolvedValue(undefined);
    mockFlush.mockResolvedValue(undefined);
  });

  it("tracks session start during lifecycle init without regressing the startup path", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lifecycle = require("@/services/telemetry/telemetryLifecycle") as typeof import("@/services/telemetry/telemetryLifecycle");

    await lifecycle.initTelemetryLifecycle();

    expect(mockTrackSessionStart).toHaveBeenCalledTimes(1);
  });

  it("flushes when app moves to background or inactive", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lifecycle = require("@/services/telemetry/telemetryLifecycle") as typeof import("@/services/telemetry/telemetryLifecycle");

    await lifecycle.initTelemetryLifecycle();
    mockAppStateChangeListener?.("background");
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFlush).toHaveBeenCalledTimes(1);

    mockAppStateChangeListener?.("active");
    await Promise.resolve();
    await Promise.resolve();
    mockAppStateChangeListener?.("inactive");
    await Promise.resolve();
    await Promise.resolve();

    expect(mockTrackSessionStart).toHaveBeenCalledTimes(2);
    expect(mockFlush).toHaveBeenCalledTimes(2);
  });

  it("removes the AppState listener on stop", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lifecycle = require("@/services/telemetry/telemetryLifecycle") as typeof import("@/services/telemetry/telemetryLifecycle");

    await lifecycle.initTelemetryLifecycle();
    lifecycle.stopTelemetryLifecycle();

    expect(mockAppStateSubscription.remove).toHaveBeenCalledTimes(1);
  });
});
