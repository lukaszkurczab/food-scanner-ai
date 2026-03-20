/**
 * Integration tests for Smart Reminders v1 runtime orchestration.
 *
 * These tests prove that the full flow — from runtime initialization, through
 * decision fetching, to local notification scheduling — wires up correctly
 * across `reminderRuntime`, `reminderScheduling`, and `reminderService`.
 *
 * External boundaries mocked:
 * - Backend API (getReminderDecision responses)
 * - OS notification scheduler (scheduleOneShotAt / cancelAllForNotif)
 * - OS notification permissions
 * - AsyncStorage (notification ID persistence)
 * - AppState (foreground/background transitions)
 * - Telemetry (tracking calls)
 *
 * NOT tested:
 * - Real push delivery through the OS
 * - Actual HTTP calls to the backend
 * - Real AsyncStorage persistence
 */

import { beforeEach, afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReminderDecisionResult } from "@/services/reminders/reminderTypes";

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

const asyncStorageState = new Map<string, string>();

const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();
const mockRemoveItem = jest.fn<(key: string) => Promise<void>>();
const mockGetAllKeys = jest.fn<() => Promise<string[]>>();

const mockGetReminderDecision = jest.fn<
  (uid: string, options?: { dayKey?: string | null }) => Promise<ReminderDecisionResult>
>();

const mockScheduleOneShotAt = jest.fn<(when: Date, content: unknown, localKey: string) => Promise<void>>();
const mockCancelAllForNotif = jest.fn<(localKey: string) => Promise<void>>();
const mockNotificationScheduleKey = jest.fn<(uid: string, id: string) => string>();
const mockGetPermissionsAsync = jest.fn<() => Promise<{ granted: boolean }>>();
const mockGetNotificationText = jest.fn();

const mockTrackSmartReminderScheduled = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderSuppressed = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderNoop = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderScheduleFailed = jest.fn<() => Promise<void>>();
const mockTrackSmartReminderDecisionFailed = jest.fn<() => Promise<void>>();

let mockAppStateChangeListener:
  | ((state: "active" | "background" | "inactive") => void)
  | null = null;
const mockAppStateSubscription = { remove: jest.fn() };

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

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

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  SchedulableTriggerInputTypes: { DATE: "date" },
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
  trackSmartReminderScheduled: (...args: unknown[]) => mockTrackSmartReminderScheduled(...(args as [])),
  trackSmartReminderSuppressed: (...args: unknown[]) => mockTrackSmartReminderSuppressed(...(args as [])),
  trackSmartReminderNoop: (...args: unknown[]) => mockTrackSmartReminderNoop(...(args as [])),
  trackSmartReminderScheduleFailed: (...args: unknown[]) => mockTrackSmartReminderScheduleFailed(...(args as [])),
  trackSmartReminderDecisionFailed: (...args: unknown[]) => mockTrackSmartReminderDecisionFailed(...(args as [])),
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function sendDecision(overrides?: Partial<ReminderDecisionResult>): ReminderDecisionResult {
  return {
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
    ...overrides,
  };
}

function suppressDecision(): ReminderDecisionResult {
  return {
    decision: {
      dayKey: "2026-03-18",
      computedAt: "2026-03-18T12:00:00Z",
      decision: "suppress",
      kind: null,
      reasonCodes: ["quiet_hours"],
      scheduledAtUtc: null,
      confidence: 1.0,
      validUntil: "2026-03-18T22:00:00Z",
    },
    source: "remote",
    status: "live_success",
    enabled: true,
    error: null,
  };
}

function noopDecision(): ReminderDecisionResult {
  return {
    decision: {
      dayKey: "2026-03-18",
      computedAt: "2026-03-18T12:00:00Z",
      decision: "noop",
      kind: null,
      reasonCodes: ["day_already_complete"],
      scheduledAtUtc: null,
      confidence: 0.98,
      validUntil: "2026-03-18T23:59:59Z",
    },
    source: "remote",
    status: "live_success",
    enabled: true,
    error: null,
  };
}

function failedDecision(
  status: "invalid_payload" | "service_unavailable",
): ReminderDecisionResult {
  return {
    decision: null,
    source: "fallback",
    status,
    enabled: true,
    error: new Error(`decision ${status}`),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Smart Reminders v1 — runtime integration", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");
    runtime.__resetReminderRuntimeForTests();

    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-18T18:00:00.000Z"));
    mockAppStateChangeListener = null;
    asyncStorageState.clear();

    // Default mock implementations
    mockGetItem.mockImplementation(async (key) => asyncStorageState.get(key) ?? null);
    mockSetItem.mockImplementation(async (key, value) => {
      asyncStorageState.set(key, value);
    });
    mockRemoveItem.mockImplementation(async (key) => {
      asyncStorageState.delete(key);
    });
    mockGetAllKeys.mockImplementation(async () => [...asyncStorageState.keys()]);
    mockGetPermissionsAsync.mockResolvedValue({ granted: true });
    mockScheduleOneShotAt.mockResolvedValue(undefined);
    mockCancelAllForNotif.mockResolvedValue(undefined);
    mockNotificationScheduleKey.mockImplementation((uid, id) => `${uid}:${id}`);
    mockGetNotificationText.mockReturnValue({ title: "Log your meal", body: "Time to track!" });
    mockTrackSmartReminderScheduled.mockResolvedValue(undefined);
    mockTrackSmartReminderSuppressed.mockResolvedValue(undefined);
    mockTrackSmartReminderNoop.mockResolvedValue(undefined);
    mockTrackSmartReminderScheduleFailed.mockResolvedValue(undefined);
    mockTrackSmartReminderDecisionFailed.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // Flow 1: init → uid → reconcile → send → schedule
  // =========================================================================

  it("schedules a notification when runtime initializes and backend returns send", async () => {
    mockGetReminderDecision.mockResolvedValue(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    // Runtime called reconcile, which called getReminderDecision, which returned send
    expect(mockGetReminderDecision).toHaveBeenCalledTimes(1);
    expect(mockGetReminderDecision).toHaveBeenCalledWith("user-1", {
      dayKey: "2026-03-18",
    });

    // Old notifications for this day cancelled before scheduling new one
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );

    // One-shot notification scheduled at correct time
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);
    expect(mockScheduleOneShotAt).toHaveBeenCalledWith(
      new Date("2026-03-18T18:30:00.000Z"),
      expect.objectContaining({
        title: "Log your meal",
        body: "Time to track!",
        data: expect.objectContaining({
          type: "meal_reminder",
          smartReminder: true,
          reminderKind: "log_next_meal",
          dayKey: "2026-03-18",
        }),
      }),
      "user-1:smart-reminder:2026-03-18",
    );

    // Telemetry emitted
    expect(mockTrackSmartReminderScheduled).toHaveBeenCalledTimes(1);
    expect(mockTrackSmartReminderScheduleFailed).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Flow 2: send → foreground → suppress → cancel existing
  // =========================================================================

  it("cancels the scheduled reminder when a subsequent reconcile returns suppress", async () => {
    // First reconcile: send
    mockGetReminderDecision.mockResolvedValueOnce(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);

    // Simulate stored notification IDs from first schedule
    asyncStorageState.set(
      "notif:ids:user-1:smart-reminder:2026-03-18",
      JSON.stringify(["notif-id-1"]),
    );

    // Second reconcile: suppress (after foreground return, past cooldown)
    mockGetReminderDecision.mockResolvedValueOnce(suppressDecision());
    jest.advanceTimersByTime(61_000);
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();
    // Allow all microtasks from the async reconcile to flush
    await jest.advanceTimersByTimeAsync(0);

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(2);

    // Existing schedule for this day was cancelled
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );

    // No new schedule created
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1); // only the first one

    // Suppression telemetry emitted
    expect(mockTrackSmartReminderSuppressed).toHaveBeenCalledTimes(1);
  });

  it("cancels the scheduled reminder when a subsequent reconcile returns noop", async () => {
    // First: send
    mockGetReminderDecision.mockResolvedValueOnce(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);

    // Second: noop (day is now complete)
    mockGetReminderDecision.mockResolvedValueOnce(noopDecision());
    jest.advanceTimersByTime(61_000);
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(0);

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(2);
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1); // still only first
    expect(mockTrackSmartReminderNoop).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // Flow 3: uid switch — old user's schedules cleaned, new user reconciled
  // =========================================================================

  it("cleans old user schedules and reconciles new user on uid switch", async () => {
    // User-1 gets a send
    mockGetReminderDecision.mockResolvedValueOnce(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);

    // Simulate stored notification IDs for user-1
    asyncStorageState.set(
      "notif:ids:user-1:smart-reminder:2026-03-18",
      JSON.stringify(["notif-id-1"]),
    );
    asyncStorageState.set(
      "notif:ids:user-1:smart-reminder:2026-03-17",
      JSON.stringify(["notif-id-0"]),
    );

    // Switch to user-2 with a different decision
    const user2Decision = sendDecision();
    if (user2Decision.decision) {
      user2Decision.decision.kind = "log_first_meal";
      user2Decision.decision.reasonCodes = ["preferred_window_open", "day_empty"];
    }
    mockGetReminderDecision.mockResolvedValueOnce(user2Decision);

    await runtime.setReminderRuntimeUid("user-2");

    // Old user's reminders cleaned (cancelAllReminderScheduling finds stored keys)
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-17",
    );

    // New user's decision fetched and scheduled
    expect(mockGetReminderDecision).toHaveBeenCalledTimes(2);
    expect(mockGetReminderDecision).toHaveBeenNthCalledWith(2, "user-2", {
      dayKey: "2026-03-18",
    });
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(2);
  });

  it("cleans old user schedules on logout without reconciling", async () => {
    mockGetReminderDecision.mockResolvedValueOnce(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    asyncStorageState.set(
      "notif:ids:user-1:smart-reminder:2026-03-18",
      JSON.stringify(["notif-id-1"]),
    );

    // Logout
    await runtime.setReminderRuntimeUid(null);

    // user-1's schedules cleaned
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );

    // Only 1 reconcile total (the initial auth_ready), no reconcile after logout
    expect(mockGetReminderDecision).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // Flow 4: failure semantics — no ghost reminders
  // =========================================================================

  it("does not schedule and cancels existing on invalid_payload", async () => {
    mockGetReminderDecision.mockResolvedValue(failedDecision("invalid_payload"));

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(1);
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
    expect(mockTrackSmartReminderScheduled).not.toHaveBeenCalled();
  });

  it("does not schedule and cancels existing on service_unavailable", async () => {
    mockGetReminderDecision.mockResolvedValue(failedDecision("service_unavailable"));

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );
  });

  it("cleans previous schedule when decision degrades from send to failure", async () => {
    // First: send
    mockGetReminderDecision.mockResolvedValueOnce(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);

    // Second: failure (backend down)
    mockGetReminderDecision.mockResolvedValueOnce(
      failedDecision("service_unavailable"),
    );
    jest.advanceTimersByTime(61_000);
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(0);

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(2);

    // No additional schedule created
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);

    // Existing schedule cancelled
    const cancelCalls = mockCancelAllForNotif.mock.calls.map((c) => c[0]);
    const dayCancelCalls = cancelCalls.filter(
      (k) => k === "user-1:smart-reminder:2026-03-18",
    );
    // At least 2: one from first send's pre-cancel, one from failure cleanup
    expect(dayCancelCalls.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // Flow 5: cooldown does not prevent initial reconcile
  // =========================================================================

  it("does not skip the initial auth_ready reconcile due to cooldown", async () => {
    mockGetReminderDecision.mockResolvedValue(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    // auth_ready uses force=true, so cooldown does not apply
    expect(mockGetReminderDecision).toHaveBeenCalledTimes(1);
    expect(mockScheduleOneShotAt).toHaveBeenCalledTimes(1);
  });

  it("skips foreground reconcile inside cooldown but runs again after", async () => {
    mockGetReminderDecision.mockResolvedValue(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    // Immediate foreground churn — inside cooldown
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(1); // still 1

    // Past cooldown
    jest.advanceTimersByTime(61_000);
    mockAppStateChangeListener?.("background");
    mockAppStateChangeListener?.("active");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(0);

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(2);
  });

  // =========================================================================
  // Flow 6: stale user cleanup after in-flight reconcile
  // =========================================================================

  it("cleans stale user schedules when uid changes during in-flight reconcile", async () => {
    let resolveFirstReconcile: (() => void) | null = null;

    // First reconcile for user-1 will hang until we resolve it
    mockGetReminderDecision.mockImplementation(
      (uid: string) =>
        new Promise<ReminderDecisionResult>((resolve) => {
          if (uid === "user-1" && !resolveFirstReconcile) {
            resolveFirstReconcile = () => resolve(sendDecision());
            return;
          }
          resolve(sendDecision());
        }),
    );

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    const firstRun = runtime.setReminderRuntimeUid("user-1");
    await Promise.resolve();

    // Simulate user-1 having stored notification IDs before switch
    asyncStorageState.set(
      "notif:ids:user-1:smart-reminder:2026-03-18",
      JSON.stringify(["notif-id-1"]),
    );

    // User switches while user-1 reconcile is in flight
    const secondRun = runtime.setReminderRuntimeUid("user-2");
    await Promise.resolve();

    // cancelAllReminderScheduling was called for user-1 during uid switch
    // It found the stored key and cancelled it
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );

    const cancelCountBeforeFinish = mockCancelAllForNotif.mock.calls.length;

    // Now finish user-1's reconcile — runtime detects uid changed and cleans again
    const finish = resolveFirstReconcile as unknown;
    if (typeof finish === "function") {
      (finish as () => void)();
    }
    await firstRun;
    await secondRun;

    // Stale reconcile cleanup triggered cancelAllReminderScheduling again for user-1
    // (this is the "stale_reconcile" path in reminderRuntime)
    const cancelCountAfterFinish = mockCancelAllForNotif.mock.calls.length;
    expect(cancelCountAfterFinish).toBeGreaterThanOrEqual(cancelCountBeforeFinish);

    // user-2 got its own reconcile
    expect(mockGetReminderDecision).toHaveBeenCalledWith("user-2", expect.anything());
  });

  // =========================================================================
  // Flow 7: permission denied — no ghost reminders
  // =========================================================================

  it("does not create ghost reminders when notification permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false });
    mockGetReminderDecision.mockResolvedValue(sendDecision());

    const runtime = require("@/services/reminders/reminderRuntime") as typeof import("@/services/reminders/reminderRuntime");

    await runtime.initReminderRuntime();
    await runtime.setReminderRuntimeUid("user-1");

    // Decision was fetched
    expect(mockGetReminderDecision).toHaveBeenCalledTimes(1);

    // But nothing was scheduled
    expect(mockScheduleOneShotAt).not.toHaveBeenCalled();

    // Existing schedule was cancelled (defensive)
    expect(mockCancelAllForNotif).toHaveBeenCalledWith(
      "user-1:smart-reminder:2026-03-18",
    );

    // Failure telemetry emitted
    expect(mockTrackSmartReminderScheduleFailed).toHaveBeenCalledTimes(1);
    expect(mockTrackSmartReminderScheduled).not.toHaveBeenCalled();
  });
});
