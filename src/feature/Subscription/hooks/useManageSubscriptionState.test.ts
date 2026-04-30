import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useManageSubscriptionState } from "@/feature/Subscription/hooks/useManageSubscriptionState";

const mockStartOrRenewSubscription =
  jest.fn<(uid?: string | null) => Promise<unknown>>();
const mockRestorePurchases = jest.fn<(uid?: string | null) => Promise<unknown>>();
const mockInitRevenueCat = jest.fn();

jest.mock("@/services/billing/purchase", () => ({
  openManageSubscriptions: jest.fn(async () => true),
  restorePurchases: (uid?: string | null) => mockRestorePurchases(uid),
  startOrRenewSubscription: (uid?: string | null) =>
    mockStartOrRenewSubscription(uid),
}));

jest.mock("@/services/billing/revenuecat", () => ({
  initRevenueCat: () => mockInitRevenueCat(),
  isBillingDisabled: () => false,
  isRevenueCatConfigured: () => true,
}));

jest.mock("@/utils/legalUrls", () => ({
  getTermsUrl: () => "https://example.com/terms",
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { privacyUrl: "https://example.com/privacy" } },
}));

const mockTrack = jest.fn();

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackDomainEntitlementConfirmationFailed: (...args: unknown[]) =>
    mockTrack("domain.entitlement.confirmation_failed", ...args),
  trackDomainEntitlementConfirmed: (...args: unknown[]) =>
    mockTrack("domain.entitlement.confirmed", ...args),
  trackDomainPurchaseStarted: (...args: unknown[]) =>
    mockTrack("domain.purchase.started", ...args),
  trackDomainPurchaseSucceeded: (...args: unknown[]) =>
    mockTrack("domain.purchase.succeeded", ...args),
  trackDomainRestoreCompleted: (...args: unknown[]) =>
    mockTrack("domain.restore.completed", ...args),
  trackDomainRestoreFailed: (...args: unknown[]) =>
    mockTrack("domain.restore.failed", ...args),
  trackDomainRestoreStarted: (...args: unknown[]) =>
    mockTrack("domain.restore.started", ...args),
  trackEntitlementActivated: (...args: unknown[]) =>
    mockTrack("entitlement_activated", ...args),
  trackPaywallViewed: (...args: unknown[]) => mockTrack("paywall_viewed", ...args),
  trackPurchaseCompleted: (...args: unknown[]) =>
    mockTrack("purchase_completed", ...args),
}));

function t(_key: string, options?: Record<string, unknown>): string {
  return typeof options?.defaultValue === "string" ? options.defaultValue : _key;
}

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    uid: "user-1",
    subscriptionState: "free_active",
    isPremium: false,
    refreshPremium: jest.fn(async () => false),
    confirmPremiumEntitlement: jest.fn(async () => true),
    setDevPremium: jest.fn(),
    t,
    ...overrides,
  };
}

describe("useManageSubscriptionState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartOrRenewSubscription.mockResolvedValue({ status: "success" });
    mockRestorePurchases.mockResolvedValue({ status: "success" });
  });

  it("keeps purchase success pending when backend entitlement confirmation fails", async () => {
    const confirmPremiumEntitlement = jest.fn(async () => false);
    const { result } = renderHook(() =>
      useManageSubscriptionState(makeParams({ confirmPremiumEntitlement })),
    );

    await act(async () => {
      await result.current.trySubscribe();
    });

    expect(mockStartOrRenewSubscription).toHaveBeenCalledWith("user-1");
    expect(confirmPremiumEntitlement).toHaveBeenCalledTimes(1);
    expect(result.current.actionFeedback).toMatchObject({
      tone: "warning",
      title: "Confirmation pending",
      source: "purchase",
    });
    expect(result.current.actionFeedback?.title).not.toBe("Premium active");
    expect(mockTrack).toHaveBeenCalledWith(
      "domain.entitlement.confirmation_failed",
      { source: "purchase", reason: "credits_not_premium" },
    );
    expect(mockTrack).not.toHaveBeenCalledWith(
      "purchase_completed",
      expect.anything(),
    );
  });

  it("shows final purchase success only after backend entitlement confirmation", async () => {
    const confirmPremiumEntitlement = jest.fn(async () => true);
    const { result } = renderHook(() =>
      useManageSubscriptionState(makeParams({ confirmPremiumEntitlement })),
    );

    await act(async () => {
      await result.current.trySubscribe();
    });

    expect(result.current.actionFeedback).toMatchObject({
      tone: "success",
      title: "Premium active",
      source: "purchase",
    });
    expect(mockTrack).toHaveBeenCalledWith(
      "domain.entitlement.confirmed",
      { source: "purchase" },
    );
  });

  it("keeps restore success pending when backend entitlement confirmation fails", async () => {
    const confirmPremiumEntitlement = jest.fn(async () => false);
    const { result } = renderHook(() =>
      useManageSubscriptionState(makeParams({ confirmPremiumEntitlement })),
    );

    await act(async () => {
      await result.current.tryRestore();
    });

    expect(mockRestorePurchases).toHaveBeenCalledWith("user-1");
    expect(result.current.actionFeedback).toMatchObject({
      tone: "warning",
      title: "Confirmation pending",
      source: "restore",
    });
    expect(mockTrack).toHaveBeenCalledWith(
      "domain.restore.completed",
      { confirmed: false },
    );
  });
});
