import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockReconcileReminderScheduling = jest.fn<
  (uid: string) => Promise<{
    outcome: "scheduled" | "cancelled" | "skipped";
    reason:
      | "scheduled"
      | "decision_disabled"
      | "decision_no_user"
      | "decision_service_unavailable"
      | "decision_invalid_payload"
      | "decision_suppress"
      | "decision_noop"
      | "permission_unavailable"
      | "channel_unavailable"
      | "invalid_time"
      | "schedule_error";
    localKey: string | null;
    result: {
      decision: null;
      source: "remote" | "fallback" | "disabled";
      status:
        | "live_success"
        | "invalid_payload"
        | "disabled"
        | "service_unavailable"
        | "no_user";
      enabled: boolean;
      error: unknown | null;
    };
  }>
>();
const mockCancelAllReminderScheduling = jest.fn<
  (uid: string) => Promise<void>
>();

let mockAppStateChangeListener:
  | ((state: "active" | "background" | "inactive") => void)
  | null = null;

const mockAppStateSubscription = { remove: jest.fn() };

function defaultSchedulingResult() {
  return {
    outcome: "cancelled" as const,
    reason: "decision_noop" as const,
    localKey: "user-1:smart-reminder:2026-03-18",
    result: {
      decision: null,
      source: "remote" as const,
      status: "live_success" as const,
      enabled: true,
      error: null,
    },
  };
}

jest.mock("@/services/reminders/reminderScheduling", () => ({
  reconcileReminderScheduling: (uid: string) =>
    mockReconcileReminderScheduling(uid),
  cancelAllReminderScheduling: (uid: string) =>
    mockCancelAllReminderScheduling(uid),
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
    warn: jest.fn(),
    error: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    child: () => ({
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      time: jest.fn(),
      timeEnd: jest.fn(),
      child: jest.fn(),
    }),
  }),
}));

describe("reminderRuntime", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");
    runtime.__resetReminderRuntimeForTests();
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAppStateChangeListener = null;
    mockReconcileReminderScheduling.mockResolvedValue(defaultSchedulingResult());
    mockCancelAllReminderScheduling.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("runs smart reminder reconcile when authenticated user becomes available", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(1);
    expect(mockReconcileReminderScheduling).toHaveBeenCalledWith("user-1");
  });

  it("runs smart reminder reconcile when app returns to foreground", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");
    jest.advanceTimersByTime(60_001);
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();

    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(2);
    expect(mockReconcileReminderScheduling).toHaveBeenNthCalledWith(2, "user-1");
  });

  it("skips foreground churn inside cooldown window", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();
    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_001);
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();

    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(2);

    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();

    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(2);
  });

  it("does not reconcile without authenticated user", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();

    expect(mockReconcileReminderScheduling).not.toHaveBeenCalled();
  });

  it("cleans scheduled smart reminders on logout", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");
    await runtime.setReminderRuntimeUid(null);

    expect(mockCancelAllReminderScheduling).toHaveBeenCalledWith("user-1");
    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(1);
  });

  it("cleans the previous user before reconciling the next one on account switch", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");
    await runtime.setReminderRuntimeUid("user-2");

    expect(mockCancelAllReminderScheduling).toHaveBeenCalledWith("user-1");
    expect(mockReconcileReminderScheduling).toHaveBeenNthCalledWith(1, "user-1");
    expect(mockReconcileReminderScheduling).toHaveBeenNthCalledWith(2, "user-2");
  });

  it("cleans stale user schedules again after an in-flight reconcile finishes", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    let resolveFirstRun: (() => void) | null = null;
    mockReconcileReminderScheduling.mockImplementation(
      (uid: string) =>
        new Promise<ReturnType<typeof defaultSchedulingResult>>((resolve) => {
          if (uid === "user-1" && !resolveFirstRun) {
            resolveFirstRun = () => resolve(defaultSchedulingResult());
            return;
          }
          resolve(defaultSchedulingResult());
        }),
    );

    await runtime.initReminderRuntime();
    const firstRun = runtime.setReminderRuntimeUid("user-1");
    await Promise.resolve();
    const secondRun = runtime.setReminderRuntimeUid("user-2");
    await Promise.resolve();

    expect(mockCancelAllReminderScheduling).toHaveBeenCalledWith("user-1");

    const finishFirstRun = resolveFirstRun as unknown;
    if (typeof finishFirstRun === "function") {
      (finishFirstRun as () => void)();
    }
    await firstRun;
    await secondRun;

    expect(mockCancelAllReminderScheduling).toHaveBeenCalledTimes(2);
    expect(mockCancelAllReminderScheduling).toHaveBeenNthCalledWith(1, "user-1");
    expect(mockCancelAllReminderScheduling).toHaveBeenNthCalledWith(2, "user-1");
    expect(mockReconcileReminderScheduling).toHaveBeenNthCalledWith(2, "user-2");
  });

  it("removes the AppState listener on stop", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    runtime.stopReminderRuntime();

    expect(mockAppStateSubscription.remove).toHaveBeenCalledTimes(1);
  });
});
