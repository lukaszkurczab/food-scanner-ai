import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState } from "react-native";
import { PremiumProvider, usePremiumContext } from "@/context/PremiumContext";

type AppStateHandler = (state: string) => void;

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
const mockTrackPremiumStateEvaluated = jest.fn<
  (input: Record<string, unknown>) => Promise<void>
>();
const mockAppStateRemove = jest.fn();
let appStateHandler: AppStateHandler | null = null;

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

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackPremiumStateEvaluated: (input: Record<string, unknown>) =>
    mockTrackPremiumStateEvaluated(input),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <PremiumProvider>{children}</PremiumProvider>;
}

describe("PremiumContext", () => {
  const asyncStorage = (
    jest.requireMock("@react-native-async-storage/async-storage") as {
      getItem: jest.Mock;
      setItem: jest.Mock;
      multiSet: jest.Mock;
    }
  );

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
    mockRcLogIn.mockResolvedValue(true);
    mockRcLogOut.mockResolvedValue(undefined);
    mockRcSetAttributes.mockResolvedValue(undefined);
    mockTrackPremiumStateEvaluated.mockResolvedValue(undefined);
    asyncStorage.getItem.mockResolvedValue(null);
    asyncStorage.setItem.mockResolvedValue(undefined);
    asyncStorage.multiSet.mockResolvedValue(undefined);
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

  it("skips sync-tier API call when user is logged out", async () => {
    mockUseAuthContext.mockReturnValue({ uid: null, email: null });

    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockRcLogOut).toHaveBeenCalled();
    });

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGetCustomerInfo).not.toHaveBeenCalled();
    expect(mockRefreshCredits).toHaveBeenCalled();
  });

  it("emits mismatch telemetry when cached premium state differs from live entitlement", async () => {
    asyncStorage.getItem.mockResolvedValueOnce("false");

    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockTrackPremiumStateEvaluated).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "customer_info",
          cacheState: "hit_false",
          mismatch: true,
        }),
      );
    });
  });

  it("refreshes premium state when app returns to active", async () => {
    renderHook(() => usePremiumContext(), { wrapper });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalledTimes(1);
    });
    expect(appStateHandler).toBeTruthy();

    await act(async () => {
      appStateHandler?.("active");
    });

    await waitFor(() => {
      expect(mockGetCustomerInfo).toHaveBeenCalledTimes(2);
    });
  });
});
