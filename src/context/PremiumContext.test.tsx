import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState } from "react-native";
import { PremiumProvider, usePremiumContext } from "@/context/PremiumContext";

type AppStateHandler = (state: string) => void;

const mockUseAuthContext = jest.fn();
const mockRefreshCredits = jest.fn<() => Promise<unknown>>();
const mockApplyCreditsFromResponse = jest.fn<(value: unknown) => unknown>();
const mockPost = jest.fn<(url: string) => Promise<unknown>>();
const mockGetCustomerInfo = jest.fn<() => Promise<unknown>>();
const mockRcLogIn = jest.fn<(uid: string) => Promise<boolean>>();
const mockRcLogOut = jest.fn<() => Promise<void>>();
const mockRcSetAttributes = jest.fn<
  (attrs: Record<string, string | null>) => Promise<void>
>();
const mockIsBillingDisabled = jest.fn(() => false);
const mockIsRevenueCatConfigured = jest.fn(() => true);
const mockAppStateRemove = jest.fn();
let appStateHandler: AppStateHandler | null = null;

function creditsSnapshot(tier: "free" | "premium") {
  return {
    userId: "user-1",
    tier,
    balance: tier === "premium" ? 800 : 50,
    allocation: tier === "premium" ? 800 : 50,
    periodStartAt: "2026-04-01T00:00:00.000Z",
    periodEndAt: "2026-05-01T00:00:00.000Z",
    costs: {
      chat: 1,
      textMeal: 5,
      photo: 10,
    },
  };
}

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => ({
    applyCreditsFromResponse: mockApplyCreditsFromResponse,
    refreshCredits: mockRefreshCredits,
  }),
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (url: string) => mockPost(url),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
}));

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    getCustomerInfo: () => mockGetCustomerInfo(),
  },
}));

jest.mock("@/services/billing/revenuecat", () => ({
  initRevenueCat: jest.fn(),
  isBillingDisabled: () => mockIsBillingDisabled(),
  isRevenueCatConfigured: () => mockIsRevenueCatConfigured(),
  rcLogIn: (uid: string) => mockRcLogIn(uid),
  rcLogOut: () => mockRcLogOut(),
  rcSetAttributes: (attrs: Record<string, string | null>) => mockRcSetAttributes(attrs),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <PremiumProvider>{children}</PremiumProvider>;
}

describe("PremiumContext", () => {
  type AsyncStorageMock = {
    getItem: jest.MockedFunction<(key: string) => Promise<string | null>>;
  };

  const asyncStorage = (
    jest.requireMock("@react-native-async-storage/async-storage") as AsyncStorageMock
  );
  let nowMs = 1_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateHandler = null;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      appStateHandler = handler as AppStateHandler;
      return {
        remove: mockAppStateRemove,
      };
    });
    mockUseAuthContext.mockReturnValue({ uid: "user-1", email: "a@b.com" });
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { premium: { identifier: "premium" } } },
    });
    mockPost.mockResolvedValue({});
    mockRefreshCredits.mockResolvedValue(null);
    mockApplyCreditsFromResponse.mockReturnValue(null);
    mockRcLogIn.mockResolvedValue(true);
    mockRcLogOut.mockResolvedValue(undefined);
    mockRcSetAttributes.mockResolvedValue(undefined);
    asyncStorage.getItem.mockResolvedValue(null);
    nowMs = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => nowMs);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("syncs ai credits tier when refreshPremium is called", async () => {
    const { result } = renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.refreshPremium();
    });

    expect(mockPost).toHaveBeenCalledWith("/ai/credits/sync-tier");
    expect(mockRefreshCredits).toHaveBeenCalled();
  });

  it("confirms premium only from backend credits tier after sync-tier", async () => {
    mockPost.mockResolvedValue(creditsSnapshot("premium"));
    mockApplyCreditsFromResponse.mockReturnValue(creditsSnapshot("premium"));

    const { result } = renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalled();
    });

    let confirmed = false;
    await act(async () => {
      confirmed = (await result.current.confirmPremiumEntitlement()).confirmed;
    });

    expect(confirmed).toBe(true);
    expect(mockPost).toHaveBeenCalledWith("/ai/credits/sync-tier");
    expect(mockApplyCreditsFromResponse).toHaveBeenCalled();
    expect(result.current.isPremium).toBe(true);
    expect(result.current.subscription?.state).toBe("premium_active");
  });

  it("dedupes concurrent premium entitlement confirmations", async () => {
    let resolveSync: ((value: unknown) => void) | null = null;
    mockApplyCreditsFromResponse.mockReturnValue(creditsSnapshot("premium"));

    const { result } = renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockRefreshCredits).toHaveBeenCalled();
    });

    mockPost.mockClear();
    mockPost.mockReturnValue(
      new Promise((resolve) => {
        resolveSync = resolve;
      }),
    );
    let first: Promise<{ confirmed: boolean }>;
    let second: Promise<{ confirmed: boolean }>;
    act(() => {
      first = result.current.confirmPremiumEntitlement();
      second = result.current.confirmPremiumEntitlement();
    });

    expect(first!).toBe(second!);
    expect(mockPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync?.(creditsSnapshot("premium"));
      await first!;
    });

    expect(result.current.isPremium).toBe(true);
    expect(result.current.subscription?.state).toBe("premium_active");
  });

  it("does not keep Premium active when RevenueCat is premium but sync-tier confirmation fails", async () => {
    const { result } = renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    mockPost.mockClear();
    mockPost.mockRejectedValueOnce(new Error("sync failed"));

    let confirmed = true;
    await act(async () => {
      confirmed = (await result.current.confirmPremiumEntitlement()).confirmed;
    });

    expect(confirmed).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.subscription?.state).not.toBe("premium_active");
  });

  it("keeps subscription unknown when RevenueCat fails", async () => {
    mockGetCustomerInfo.mockRejectedValueOnce(new Error("revenuecat offline"));

    const { result } = renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current.subscription?.state).toBe("unknown");
    });

    expect(result.current.isPremium).toBeNull();
    expect(result.current.subscription?.state).not.toBe("premium_active");
  });

  it("skips sync-tier API call when user is logged out", async () => {
    mockUseAuthContext.mockReturnValue({ uid: null, email: null });

    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockRcLogOut).toHaveBeenCalled();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
    expect(mockRefreshCredits).not.toHaveBeenCalled();
  });

  it("refreshes premium state when app returns to active", async () => {
    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalledTimes(1);
    });
    expect(appStateHandler).toBeTruthy();
    mockGetCustomerInfo.mockClear();
    mockPost.mockClear();
    mockRefreshCredits.mockClear();

    await act(async () => {
      nowMs += 31_000;
      appStateHandler?.("active");
    });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalledTimes(1);
    });
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockRefreshCredits).toHaveBeenCalledTimes(1);
  });

  it("runs at most one access refresh sequence when app resumes repeatedly", async () => {
    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalledTimes(1);
    });
    mockGetCustomerInfo.mockClear();
    mockPost.mockClear();
    mockRefreshCredits.mockClear();

    await act(async () => {
      nowMs += 31_000;
      appStateHandler?.("active");
      appStateHandler?.("active");
    });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalledTimes(1);
    });
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockRefreshCredits).toHaveBeenCalledTimes(1);
  });
});
