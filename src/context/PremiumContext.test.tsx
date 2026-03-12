import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PremiumProvider, usePremiumContext } from "@/context/PremiumContext";

const mockUseAuthContext = jest.fn();
const mockRefreshCredits = jest.fn<() => Promise<unknown>>();
const mockPost = jest.fn<(url: string) => Promise<unknown>>();
const mockGetCustomerInfo = jest.fn<() => Promise<unknown>>();
const mockRcLogIn = jest.fn<(uid: string) => Promise<boolean>>();
const mockRcLogOut = jest.fn<() => Promise<void>>();
const mockRcSetAttributes = jest.fn<
  (attrs: Record<string, string | null>) => Promise<void>
>();
const mockIsBillingDisabled = jest.fn(() => false);
const mockIsRevenueCatConfigured = jest.fn(() => true);

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => ({
    refreshCredits: mockRefreshCredits,
  }),
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (url: string) => mockPost(url),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  multiSet: jest.fn(async () => undefined),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ uid: "user-1", email: "a@b.com" });
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: { premium: { identifier: "premium" } } },
    });
    mockPost.mockResolvedValue({});
    mockRefreshCredits.mockResolvedValue(null);
    mockRcLogIn.mockResolvedValue(true);
    mockRcLogOut.mockResolvedValue(undefined);
    mockRcSetAttributes.mockResolvedValue(undefined);
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

  it("skips sync-tier API call when user is logged out", async () => {
    mockUseAuthContext.mockReturnValue({ uid: null, email: null });

    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockRcLogOut).toHaveBeenCalled();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockRefreshCredits).toHaveBeenCalled();
  });
});
