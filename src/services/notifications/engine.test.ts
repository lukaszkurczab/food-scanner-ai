import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { reconcileAll } from "@/services/notifications/engine";

const mockEnsureAndroidChannel = jest.fn<() => Promise<void>>();
const mockDebugLog = jest.fn();
const mockDebugWarn = jest.fn();
const mockRunSystemNotifications = jest.fn<(uid: string) => Promise<void>>();
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
const mockIsSmartRemindersEnabled = jest.fn<() => boolean>();

jest.mock("@/services/notifications/localScheduler", () => ({
  ensureAndroidChannel: () => mockEnsureAndroidChannel(),
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

jest.mock("@/utils/debug", () => ({
  debugScope: () => ({
    log: (...args: unknown[]) => mockDebugLog(...args),
    warn: (...args: unknown[]) => mockDebugWarn(...args),
    error: () => undefined,
    time: () => undefined,
    timeEnd: () => undefined,
    child: () => ({
      log: (...args: unknown[]) => mockDebugLog(...args),
      warn: (...args: unknown[]) => mockDebugWarn(...args),
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
    mockRunSystemNotifications.mockResolvedValue(undefined);
    mockReconcileReminderScheduling.mockResolvedValue({
      outcome: "cancelled",
      reason: "decision_noop",
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
    mockIsSmartRemindersEnabled.mockReturnValue(true);
  });

  it("runs canonical smart reminder reconcile and system notifications", async () => {
    await reconcileAll("user-1");

    expect(mockEnsureAndroidChannel).toHaveBeenCalledTimes(1);
    expect(mockReconcileReminderScheduling).toHaveBeenCalledWith("user-1");
    expect(mockRunSystemNotifications).toHaveBeenCalledWith("user-1");
  });

  it("keeps smart reminder canonical path inactive when globally disabled", async () => {
    mockIsSmartRemindersEnabled.mockReturnValue(false);

    await reconcileAll("user-1");

    expect(mockReconcileReminderScheduling).not.toHaveBeenCalled();
    expect(mockRunSystemNotifications).toHaveBeenCalledWith("user-1");
  });

  it("does not abort engine when smart reminder reconcile throws", async () => {
    mockReconcileReminderScheduling.mockRejectedValue(new Error("runtime failed"));

    await reconcileAll("user-1");

    expect(mockReconcileReminderScheduling).toHaveBeenCalledWith("user-1");
    expect(mockRunSystemNotifications).toHaveBeenCalledWith("user-1");
    expect(mockDebugWarn).toHaveBeenCalled();
  });

  it("is idempotent while a reconcile is in-flight for the same uid", async () => {
    let release: (() => void) | null = null;
    mockReconcileReminderScheduling.mockImplementation(
      async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return {
          outcome: "cancelled",
          reason: "decision_noop",
          localKey: "user-1:smart-reminder:2026-03-18",
          result: {
            decision: null,
            source: "remote",
            status: "live_success",
            enabled: true,
            error: null,
          },
        };
      },
    );

    const firstRun = reconcileAll("user-1");
    const secondRun = reconcileAll("user-1");
    await Promise.resolve();

    expect(mockReconcileReminderScheduling).toHaveBeenCalledTimes(1);

    (release as (() => void) | null)?.();
    await firstRun;
    await secondRun;

    expect(mockRunSystemNotifications).toHaveBeenCalledTimes(1);
  });
});
