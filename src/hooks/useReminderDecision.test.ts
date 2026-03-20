import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReminderDecisionResult } from "@/services/reminders/reminderTypes";
import { useReminderDecision } from "@/hooks/useReminderDecision";

const mockGetReminderDecision = jest.fn<
  (
    uid: string | null | undefined,
    options?: { dayKey?: string | null },
  ) => Promise<ReminderDecisionResult>
>();

jest.mock("@/services/reminders/reminderService", () => {
  return {
    getCurrentReminderDecisionDayKey: () => "2026-03-18",
    getReminderDecision: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null },
    ) => mockGetReminderDecision(uid, options),
  };
});

describe("useReminderDecision", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads reminder decision for the requested uid and day", async () => {
    mockGetReminderDecision.mockResolvedValue({
      decision: {
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T12:00:00Z",
        decision: "send",
        kind: "log_next_meal",
        reasonCodes: [
          "preferred_window_today",
          "day_partially_logged",
        ],
        scheduledAtUtc: "2026-03-18T18:30:00Z",
        confidence: 0.84,
        validUntil: "2026-03-18T19:30:00Z",
      },
      source: "remote",
      status: "live_success",
      enabled: true,
      error: null,
    });

    const { result } = renderHook(() =>
      useReminderDecision({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetReminderDecision).toHaveBeenCalledWith("user-1", {
      dayKey: "2026-03-18",
    });
    expect(result.current.decision?.kind).toBe("log_next_meal");
    expect(result.current.source).toBe("remote");
    expect(result.current.status).toBe("live_success");
    expect(result.current.enabled).toBe(true);
  });

  it("returns a stable fallback when uid is missing and skips the service", async () => {
    const { result } = renderHook(() => useReminderDecision({ uid: null }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetReminderDecision).not.toHaveBeenCalled();
    expect(result.current.decision).toBeNull();
    expect(result.current.source).toBe("fallback");
    expect(result.current.status).toBe("no_user");
  });

  it("exposes disabled service fallback when reminder endpoint is gated off", async () => {
    mockGetReminderDecision.mockResolvedValue({
      decision: null,
      source: "disabled",
      status: "disabled",
      enabled: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useReminderDecision({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decision).toBeNull();
    expect(result.current.enabled).toBe(false);
    expect(result.current.source).toBe("disabled");
    expect(result.current.status).toBe("disabled");
  });

  it("supports explicit refresh and replaces the current decision", async () => {
    mockGetReminderDecision
      .mockResolvedValueOnce({
        decision: null,
        source: "fallback",
        status: "service_unavailable",
        enabled: true,
        error: new Error("backend down"),
      })
      .mockResolvedValueOnce({
        decision: {
          dayKey: "2026-03-18",
          computedAt: "2026-03-18T12:05:00Z",
          decision: "suppress",
          kind: null,
          reasonCodes: ["quiet_hours"],
          scheduledAtUtc: null,
          confidence: 1,
          validUntil: "2026-03-18T22:00:00Z",
        },
        source: "remote",
        status: "live_success",
        enabled: true,
        error: null,
      });

    const { result } = renderHook(() =>
      useReminderDecision({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decision).toBeNull();
    expect(result.current.status).toBe("service_unavailable");

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetReminderDecision).toHaveBeenCalledTimes(2);
    expect(mockGetReminderDecision).toHaveBeenLastCalledWith("user-1", {
      dayKey: "2026-03-18",
    });
    await waitFor(() => {
      expect(result.current.decision?.decision).toBe("suppress");
    });
    expect(result.current.source).toBe("remote");
    expect(result.current.status).toBe("live_success");
  });
});
