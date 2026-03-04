import {
  listBadges,
  subscribeBadges,
  unlockPremiumBadgesIfEligible,
} from "@/services/badgeService";
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

describe("badgeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockReturnValue(() => undefined);
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
  });

  it("lists badges through backend read endpoint", async () => {
    mockGet.mockResolvedValue({
      items: [
        {
          id: "premium_start",
          type: "premium",
          label: "Premium started",
          milestone: "start",
          icon: "⭐",
          color: "#F7A541",
          unlockedAt: 2,
        },
        {
          id: "streak_7",
          type: "streak",
          label: "7 days streak",
          milestone: 7,
          icon: "🔥",
          color: "#5AA469",
          unlockedAt: 1,
        },
      ],
    });

    await expect(listBadges("user-1")).resolves.toEqual([
      expect.objectContaining({ id: "streak_7", unlockedAt: 1 }),
      expect.objectContaining({ id: "premium_start", unlockedAt: 2 }),
    ]);
    expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me/badges");
    expect(mockSetItem).toHaveBeenCalledWith(
      "badge:list:user-1",
      expect.any(String),
    );
  });

  it("returns cached badges when backend is unavailable", async () => {
    mockGet.mockRejectedValueOnce(new Error("offline"));
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify([
        {
          id: "streak_7",
          type: "streak",
          label: "7",
          milestone: 7,
          icon: "🔥",
          color: "#0f0",
          unlockedAt: 1,
        },
      ]),
    );

    await expect(listBadges("user-1")).resolves.toEqual([
      expect.objectContaining({ id: "streak_7" }),
    ]);
  });

  it("subscribes via event bus and refreshes backend-backed badge list", async () => {
    const off = jest.fn();
    let handler: ((payload?: { uid?: string }) => void) | undefined;
    mockOn.mockImplementation(
      (...args: unknown[]) => {
        const [event, next] = args as [
          string,
          (payload?: { uid?: string }) => void,
        ];
        if (event === "badge:changed") {
          handler = next;
        }
        return off;
      },
    );
    mockGet
      .mockResolvedValueOnce({
        items: [
          {
            id: "streak_7",
            type: "streak",
            label: "7",
            milestone: 7,
            icon: "🔥",
            color: "#0f0",
            unlockedAt: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "premium_start",
            type: "premium",
            label: "Premium",
            milestone: "start",
            icon: "⭐",
            color: "#ff0",
            unlockedAt: 2,
          },
        ],
      });

    const cb = jest.fn();
    const unsubscribe = subscribeBadges("user-1", cb);
    await Promise.resolve();
    await Promise.resolve();

    handler?.({ uid: "user-1" });
    await Promise.resolve();
    await Promise.resolve();

    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls.some((call) => call[0]?.[0]?.id === "streak_7")).toBe(true);
    expect(mockGet).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(off).toHaveBeenCalled();
  });

  it("delegates premium badge reconcile to backend", async () => {
    mockPost.mockResolvedValue({
      awardedBadgeIds: ["premium_start"],
      hasPremiumBadge: true,
      updated: true,
    });

    await unlockPremiumBadgesIfEligible("user-1", true);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/users/me/badges/premium/reconcile",
      { isPremium: true },
    );
    expect(mockEmit).toHaveBeenCalledWith("badge:changed", { uid: "user-1" });
  });

  it("no-ops when uid is missing", async () => {
    await unlockPremiumBadgesIfEligible("", true);

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
