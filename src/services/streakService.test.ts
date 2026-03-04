import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGet = jest.fn<(url: string) => Promise<unknown>>();
const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
const mockEmit = jest.fn<(event: string, payload?: unknown) => void>();
const mockOn = jest.fn<(...args: unknown[]) => () => void>();
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();

jest.mock("@/services/apiClient", () => ({
  get: (url: string) => mockGet(url),
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/services/events", () => ({
  emit: (event: string, payload?: unknown) => mockEmit(event, payload),
  on: (...args: unknown[]) => mockOn(...args),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const streakService = require("@/services/streakService") as typeof import("@/services/streakService");
const {
  ensureStreakDoc,
  getStreak,
  resetIfMissed,
  subscribeStreak,
  updateStreakIfThresholdMet,
} = streakService;

describe("streakService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockOn.mockReturnValue(() => undefined);
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
  });

  it("delegates ensure and reset writes to backend streak endpoints", async () => {
    mockPost.mockResolvedValue({
      current: 0,
      lastDate: null,
      awardedBadgeIds: [],
    });

    await expect(ensureStreakDoc("user-1")).resolves.toEqual({
      current: 0,
      lastDate: null,
    });
    await expect(
      resetIfMissed("user-1", new Date("2026-03-03T12:00:00.000Z"))
    ).resolves.toEqual({
      current: 0,
      lastDate: null,
    });

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      "/users/me/streak/ensure",
      { dayKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      "/users/me/streak/reset-if-missed",
      { dayKey: "2026-03-03" }
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      "streak:last:user-1",
      JSON.stringify({ current: 0, lastDate: null }),
    );
    expect(mockEmit).toHaveBeenNthCalledWith(
      1,
      "streak:changed",
      { uid: "user-1", streak: { current: 0, lastDate: null } },
    );
  });

  it("delegates streak threshold recalculation to backend", async () => {
    mockPost.mockResolvedValue({
      current: 7,
      lastDate: "2026-03-03",
      awardedBadgeIds: ["streak_7"],
    });

    await expect(
      updateStreakIfThresholdMet({
        uid: "user-1",
        todaysKcal: 1600,
        targetKcal: 2000,
        thresholdPct: 0.8,
        now: new Date("2026-03-03T18:00:00.000Z"),
      })
    ).resolves.toEqual({
      current: 7,
      lastDate: "2026-03-03",
    });

    expect(mockPost).toHaveBeenCalledWith(
      "/users/me/streak/recalculate",
      {
        dayKey: "2026-03-03",
        todaysKcal: 1600,
        targetKcal: 2000,
        thresholdPct: 0.8,
      }
    );
    expect(mockEmit).toHaveBeenCalledWith(
      "badge:changed",
      { uid: "user-1", awardedBadgeIds: ["streak_7"] },
    );
  });

  it("reads streak from backend and falls back to cached streak on API failure", async () => {
    mockGet
      .mockResolvedValueOnce({
        current: 4,
        lastDate: "2026-03-03",
        awardedBadgeIds: [],
      })
      .mockRejectedValueOnce(new Error("backend down"));
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ current: 2, lastDate: "2026-03-02" }),
    );

    await expect(getStreak("user-1")).resolves.toEqual({
      current: 4,
      lastDate: "2026-03-03",
    });
    await expect(getStreak("user-1")).resolves.toEqual({
      current: 2,
      lastDate: "2026-03-02",
    });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/users/me/streak");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/users/me/streak");
  });

  it("subscribes through event bus and refreshes streak state", async () => {
    const off = jest.fn();
    let handler:
      | ((payload?: { uid?: string; streak?: { current?: number; lastDate?: string | null } }) => void)
      | undefined;
    mockOn.mockImplementation(
      (...args: unknown[]) => {
        const [event, next] = args as [
          string,
          (payload?: {
            uid?: string;
            streak?: { current?: number; lastDate?: string | null };
          }) => void,
        ];
        if (event === "streak:changed") {
          handler = next;
        }
        return off;
      },
    );
    mockGet.mockResolvedValueOnce({
      current: 3,
      lastDate: "2026-03-02",
      awardedBadgeIds: [],
    });

    const cb = jest.fn();
    const unsubscribe = subscribeStreak("user-1", cb);
    await Promise.resolve();
    await Promise.resolve();

    handler?.({
      uid: "user-1",
      streak: { current: 4, lastDate: "2026-03-03" },
    });
    await Promise.resolve();

    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls.at(-1)?.[0]).toEqual({
      current: 4,
      lastDate: "2026-03-03",
    });

    unsubscribe();
    expect(off).toHaveBeenCalled();
  });
});
