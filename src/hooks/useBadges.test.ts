import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { useBadges } from "@/hooks/useBadges";
import {
  listBadges,
  subscribeBadges,
  unlockPremiumBadgesIfEligible,
} from "@/services/gamification/badgeService";
import type { Badge } from "@/types/badge";

jest.mock("@/services/gamification/badgeService", () => ({
  listBadges: jest.fn(),
  subscribeBadges: jest.fn(),
  unlockPremiumBadgesIfEligible: jest.fn(),
}));

const subscribeBadgesMock = subscribeBadges as jest.MockedFunction<
  typeof subscribeBadges
>;
const listBadgesMock = listBadges as jest.MockedFunction<typeof listBadges>;
const unlockPremiumBadgesIfEligibleMock =
  unlockPremiumBadgesIfEligible as jest.MockedFunction<
    typeof unlockPremiumBadgesIfEligible
  >;

const sampleBadges: Badge[] = [
  {
    id: "streak_7",
    type: "streak",
    label: "7",
    milestone: 7,
    icon: "🔥",
    color: "#0f0",
    unlockedAt: 1,
  },
];

describe("useBadges", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    subscribeBadgesMock.mockReset();
    listBadgesMock.mockReset();
    unlockPremiumBadgesIfEligibleMock.mockReset();
  });

  it("subscribes for uid, updates badges and cleans subscriptions on unmount", async () => {
    const off = jest.fn();
    subscribeBadgesMock.mockImplementation((_uid, cb) => {
      cb(sampleBadges);
      return off;
    });

    const { result, unmount } = renderHook(() => useBadges("user-1"));

    await waitFor(() => {
      expect(result.current.badges).toEqual(sampleBadges);
    });

    expect(subscribeBadgesMock).toHaveBeenCalledWith("user-1", expect.any(Function));

    unmount();
    expect(off).toHaveBeenCalledTimes(1);
  });

  it("refreshes badge list and handles premium badge unlocking guard", async () => {
    subscribeBadgesMock.mockReturnValue(() => undefined);
    listBadgesMock.mockResolvedValue(sampleBadges);
    unlockPremiumBadgesIfEligibleMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useBadges("user-2"));

    await act(async () => {
      await result.current.refresh();
    });
    expect(listBadgesMock).toHaveBeenCalledWith("user-2");
    expect(result.current.badges).toEqual(sampleBadges);

    await act(async () => {
      await result.current.ensurePremiumBadges(true);
      await result.current.ensurePremiumBadges(null);
    });
    expect(unlockPremiumBadgesIfEligibleMock).toHaveBeenCalledTimes(1);
    expect(unlockPremiumBadgesIfEligibleMock).toHaveBeenCalledWith("user-2", true);
  });

  it("does not subscribe and no-ops actions when uid is missing", async () => {
    const { result } = renderHook(() => useBadges(null));

    await act(async () => {
      await result.current.refresh();
      await result.current.ensurePremiumBadges(true);
    });

    expect(subscribeBadgesMock).not.toHaveBeenCalled();
    expect(listBadgesMock).not.toHaveBeenCalled();
    expect(unlockPremiumBadgesIfEligibleMock).not.toHaveBeenCalled();
  });
});
