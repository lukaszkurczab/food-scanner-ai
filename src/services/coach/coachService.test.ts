import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockGet = jest.fn<(path: string, options?: unknown) => Promise<unknown>>();
const mockReadPublicEnv = jest.fn<(name: string) => string | undefined>();
const mockWarn = jest.fn<(...args: unknown[]) => void>();

jest.mock("@/services/core/apiClient", () => ({
  get: (path: string, options?: unknown) => mockGet(path, options),
}));

jest.mock("@/services/core/publicEnv", () => ({
  readPublicEnv: (name: string) => mockReadPublicEnv(name),
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

describe("coachService", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_ENABLE_V2_STATE") {
        return "true";
      }
      return undefined;
    });
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    const service =
      jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");
    service.__resetCoachServiceForTests();
    await AsyncStorage.clear();
  });

  it("fetches coach insights and persists the last good response", async () => {
    mockGet.mockResolvedValue({
      dayKey: "2026-03-18",
      computedAt: "2026-03-18T12:00:00Z",
      source: "rules",
      insights: [],
      topInsight: null,
      meta: { available: true, emptyReason: "no_data", isDegraded: false },
    });

    const service =
      jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");

    const result = await service.getCoach("user-1", { dayKey: "2026-03-18" });

    expect(mockGet).toHaveBeenCalledWith("/api/v2/users/me/coach?day=2026-03-18", {
      timeout: 15_000,
    });
    expect(result.enabled).toBe(true);
    expect(result.source).toBe("remote");
    expect(result.isStale).toBe(false);
    expect(result.coach.meta.emptyReason).toBe("no_data");
    expect(await AsyncStorage.getItem("coach:last:v1:user-1:2026-03-18")).toEqual(
      expect.any(String),
    );
  });

  it("returns a disabled fallback and skips the endpoint when v2 state is off", async () => {
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_ENABLE_V2_STATE") {
        return "false";
      }
      return undefined;
    });

    const service =
      jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");

    const result = await service.getCoach("user-1", { dayKey: "2026-03-18" });

    expect(result.enabled).toBe(false);
    expect(result.source).toBe("disabled");
    expect(result.coach.dayKey).toBe("2026-03-18");
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("uses in-memory cache for repeated reads of the same user and day", async () => {
    mockGet.mockResolvedValue({
      dayKey: "2026-03-18",
      computedAt: "2026-03-18T12:00:00Z",
      source: "rules",
      insights: [],
      topInsight: null,
      meta: { available: true, emptyReason: "no_data", isDegraded: false },
    });

    const service =
      jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");

    const first = await service.getCoach("user-1", { dayKey: "2026-03-18" });
    const second = await service.getCoach("user-1", { dayKey: "2026-03-18" });

    expect(first.source).toBe("remote");
    expect(second.source).toBe("memory");
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("falls back to persisted response when refresh fails", async () => {
    await AsyncStorage.setItem(
      "coach:last:v1:user-1:2026-03-18",
      JSON.stringify({
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T10:00:00Z",
        source: "rules",
        insights: [],
        topInsight: null,
        meta: { available: true, emptyReason: "insufficient_data", isDegraded: false },
      }),
    );
    mockGet.mockRejectedValue(new Error("backend down"));

    const service =
      jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");

    const result = await service.getCoach("user-1", { dayKey: "2026-03-18" });

    expect(result.source).toBe("storage");
    expect(result.isStale).toBe(true);
    expect(result.coach.meta.emptyReason).toBe("insufficient_data");
    expect(mockWarn).toHaveBeenCalled();
  });

  it("invalidates cached coach response so the next read refetches remote", async () => {
    mockGet
      .mockResolvedValueOnce({
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T10:00:00Z",
        source: "rules",
        insights: [],
        topInsight: null,
        meta: { available: true, emptyReason: "no_data", isDegraded: false },
      })
      .mockResolvedValueOnce({
        dayKey: "2026-03-18",
        computedAt: "2026-03-18T11:00:00Z",
        source: "rules",
        insights: [
          {
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
          },
        ],
        topInsight: {
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
        },
        meta: { available: true, emptyReason: null, isDegraded: false },
      });

    const service =
      jest.requireActual("@/services/coach/coachService") as typeof import("@/services/coach/coachService");

    const first = await service.getCoach("user-1", { dayKey: "2026-03-18" });
    await service.invalidateCoachCache("user-1", { dayKey: "2026-03-18" });
    const second = await service.getCoach("user-1", { dayKey: "2026-03-18" });

    expect(first.coach.topInsight).toBeNull();
    expect(second.coach.topInsight?.type).toBe("under_logging");
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
