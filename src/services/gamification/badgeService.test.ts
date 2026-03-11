import {
  listBadges,
  primeBadges,
  subscribeBadges,
  unlockPremiumBadgesIfEligible,
} from "@/services/gamification/badgeService";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type BadgeListCallback = (badges: Array<{ id: string }>) => void;

const mockGet = jest.fn<(url: string) => Promise<unknown>>();
const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
const mockEmit = jest.fn<(event: string, payload?: unknown) => void>();
const mockOn = jest.fn<(...args: unknown[]) => () => void>();
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

jest.mock("@/services/core/apiClient", () => ({
  get: (url: string) => mockGet(url),
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/services/core/events", () => ({
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
    expect(mockGet).toHaveBeenCalledWith("/users/me/badges");
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

    const cb = jest.fn<BadgeListCallback>();
    const unsubscribe = subscribeBadges("user-events", cb);
    await flushAsync();

    handler?.({ uid: "user-events" });
    await flushAsync();

    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls.some((call) => call[0]?.[0]?.id === "streak_7")).toBe(true);
    expect(mockGet).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(off).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent badge fetches for the same uid", async () => {
    mockGet.mockResolvedValue({
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
    });

    const cb1 = jest.fn<BadgeListCallback>();
    const cb2 = jest.fn<BadgeListCallback>();
    const unsubscribe1 = subscribeBadges("user-dedupe", cb1);
    const unsubscribe2 = subscribeBadges("user-dedupe", cb2);

    await flushAsync();
    expect(mockGet).toHaveBeenCalledTimes(1);

    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();

    unsubscribe1();
    unsubscribe2();
  });

  it("loads badges at startup and does not refetch on later subscribe", async () => {
    mockGet.mockResolvedValue({
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
    });

    await primeBadges("user-startup");
    const cb = jest.fn<BadgeListCallback>();
    const unsubscribe = subscribeBadges("user-startup", cb);

    await flushAsync();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "streak_7" })]),
    );

    unsubscribe();
  });

  it("delegates premium badge reconcile to backend", async () => {
    mockPost.mockResolvedValue({
      awardedBadgeIds: ["premium_start"],
      hasPremiumBadge: true,
      updated: true,
    });

    await unlockPremiumBadgesIfEligible("user-1", true);

    expect(mockPost).toHaveBeenCalledWith(
      "/users/me/badges/premium/reconcile",
      { isPremium: true },
    );
    expect(mockEmit).toHaveBeenCalledWith("badge:changed", { uid: "user-1" });
  });

  it("deduplicates concurrent premium reconcile calls with same state", async () => {
    mockPost.mockResolvedValue({
      awardedBadgeIds: ["premium_start"],
      hasPremiumBadge: true,
      updated: true,
    });

    const one = unlockPremiumBadgesIfEligible("user-1", true);
    const two = unlockPremiumBadgesIfEligible("user-1", true);

    await Promise.all([one, two]);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith("badge:changed", { uid: "user-1" });
  });

  it("no-ops when uid is missing", async () => {
    await unlockPremiumBadgesIfEligible("", true);

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
