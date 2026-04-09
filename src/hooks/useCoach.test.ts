import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { emit } from "@/services/core/events";
import type { CoachResult } from "@/services/coach/coachTypes";
import { createFallbackCoachResponse } from "@/services/coach/coachService";
import { useCoach } from "@/hooks/useCoach";

const mockGetCoach = jest.fn<
  (uid: string | null | undefined, options?: { dayKey?: string | null; force?: boolean }) => Promise<CoachResult>
>();
const mockRefreshCoach = jest.fn<
  (uid: string | null | undefined, options?: { dayKey?: string | null }) => Promise<CoachResult>
>();
const mockInvalidateCoachCache = jest.fn<
  (uid: string | null | undefined, options?: { dayKey?: string | null }) => Promise<void>
>();

jest.mock("@/services/coach/coachService", () => {
  const actual =
    jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");
  return {
    ...actual,
    getCoach: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null; force?: boolean },
    ) => mockGetCoach(uid, options),
    refreshCoach: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null },
    ) => mockRefreshCoach(uid, options),
    invalidateCoachCache: (
      uid: string | null | undefined,
      options?: { dayKey?: string | null },
    ) => mockInvalidateCoachCache(uid, options),
  };
});

describe("useCoach", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidateCoachCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads coach data for the requested uid and day", async () => {
    const remoteCoach = createFallbackCoachResponse("2026-03-18");
    remoteCoach.meta.available = true;
    remoteCoach.meta.emptyReason = "no_data";

    mockGetCoach.mockResolvedValue({
      coach: remoteCoach,
      source: "remote",
      status: "live_success",
      enabled: true,
      isStale: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useCoach({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetCoach).toHaveBeenCalledWith("user-1", { dayKey: "2026-03-18" });
    expect(result.current.coach.meta.available).toBe(true);
    expect(result.current.source).toBe("remote");
    expect(result.current.status).toBe("live_success");
    expect(result.current.enabled).toBe(true);
  });

  it("returns a stable fallback when uid is missing and skips the service", async () => {
    const { result } = renderHook(() => useCoach({ uid: null }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetCoach).not.toHaveBeenCalled();
    expect(result.current.source).toBe("fallback");
    expect(result.current.status).toBe("no_user");
    expect(result.current.isStale).toBe(true);
    expect(result.current.coach.topInsight).toBeNull();
  });

  it("exposes service fallback when coach endpoint is unavailable", async () => {
    mockGetCoach.mockResolvedValue({
      coach: createFallbackCoachResponse("2026-03-18"),
      source: "fallback",
      status: "service_unavailable",
      enabled: true,
      isStale: true,
      error: new Error("backend down"),
    });

    const { result } = renderHook(() =>
      useCoach({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.source).toBe("fallback");
    expect(result.current.status).toBe("service_unavailable");
  });

  it("keeps coach fallback stable on failure and supports explicit refresh", async () => {
    const fallbackCoach = createFallbackCoachResponse("2026-03-18");
    fallbackCoach.meta.available = true;
    fallbackCoach.meta.emptyReason = "insufficient_data";

    const refreshedCoach = createFallbackCoachResponse("2026-03-18");
    refreshedCoach.meta.available = true;
    refreshedCoach.topInsight = {
      id: "2026-03-18:under_logging",
      type: "under_logging",
      priority: 100,
      title: "Logging looks too light to coach well",
      body: "Log your next meal so today is easier to interpret and adjust.",
      actionLabel: "Log next meal",
      actionType: "log_next_meal",
      reasonCodes: ["valid_logging_days_7_low"],
      source: "rules",
      validUntil: "2026-03-18T23:59:59Z",
      confidence: 0.92,
      isPositive: false,
    };
    refreshedCoach.insights = [refreshedCoach.topInsight];

    mockGetCoach.mockResolvedValue({
      coach: fallbackCoach,
      source: "storage",
      status: "stale_cache",
      enabled: true,
      isStale: true,
      error: new Error("backend down"),
    });
    mockRefreshCoach.mockResolvedValue({
      coach: refreshedCoach,
      source: "remote",
      status: "live_success",
      enabled: true,
      isStale: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useCoach({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.coach.meta.emptyReason).toBe("insufficient_data");
    expect(result.current.source).toBe("storage");
    expect(result.current.status).toBe("stale_cache");
    expect(result.current.error).toEqual(expect.any(Error));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockRefreshCoach).toHaveBeenCalledWith("user-1", { dayKey: "2026-03-18" });
    await waitFor(() => {
      expect(result.current.coach.topInsight?.type).toBe("under_logging");
    });
    expect(result.current.source).toBe("remote");
    expect(result.current.status).toBe("live_success");
    expect(result.current.isStale).toBe(false);
  });

  it("surfaces service unavailable distinctly when no live or cached coach payload exists", async () => {
    mockGetCoach.mockResolvedValue({
      coach: createFallbackCoachResponse("2026-03-18"),
      source: "fallback",
      status: "service_unavailable",
      enabled: true,
      isStale: true,
      error: new Error("backend down"),
    });

    const { result } = renderHook(() =>
      useCoach({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.source).toBe("fallback");
    expect(result.current.status).toBe("service_unavailable");
    expect(result.current.coach.meta.available).toBe(false);
    expect(result.current.error).toEqual(expect.any(Error));
  });

  it("invalidates and refreshes coach after a meal mutation for the same user", async () => {
    const initialCoach = createFallbackCoachResponse("2026-03-18");
    initialCoach.meta.available = true;

    const refreshedCoach = createFallbackCoachResponse("2026-03-18");
    refreshedCoach.meta.available = true;
    refreshedCoach.topInsight = {
      id: "2026-03-18:under_logging",
      type: "under_logging",
      priority: 100,
      title: "Logging looks too light to coach well",
      body: "Log your next meal so today is easier to interpret and adjust.",
      actionLabel: "Log next meal",
      actionType: "log_next_meal",
      reasonCodes: ["valid_logging_days_7_low"],
      source: "rules",
      validUntil: "2026-03-18T23:59:59Z",
      confidence: 0.92,
      isPositive: false,
    };
    refreshedCoach.insights = [refreshedCoach.topInsight];

    mockGetCoach.mockResolvedValue({
      coach: initialCoach,
      source: "remote",
      status: "live_success",
      enabled: true,
      isStale: false,
      error: null,
    });
    mockRefreshCoach.mockResolvedValue({
      coach: refreshedCoach,
      source: "remote",
      status: "live_success",
      enabled: true,
      isStale: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useCoach({ uid: "user-1", dayKey: "2026-03-18" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      emit("meal:added", { uid: "user-1" });
    });

    await waitFor(() => {
      expect(mockInvalidateCoachCache).toHaveBeenCalledWith("user-1", {
        dayKey: "2026-03-18",
      });
    });
    expect(mockRefreshCoach).toHaveBeenCalledWith("user-1", {
      dayKey: "2026-03-18",
    });
    await waitFor(() => {
      expect(result.current.coach.topInsight?.type).toBe("under_logging");
    });
  });
});
