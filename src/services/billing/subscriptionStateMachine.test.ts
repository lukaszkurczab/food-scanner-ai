import { describe, expect, it } from "@jest/globals";
import {
  hasPremiumAccess,
  mapUnknownSubscription,
  mapPremiumToSubscription,
  resolveSubscriptionFromRevenueCat,
} from "@/services/billing/subscriptionStateMachine";

describe("subscriptionStateMachine", () => {
  it("maps boolean premium fallback to base subscription state", () => {
    expect(mapPremiumToSubscription(true)).toEqual({ state: "premium_active" });
    expect(mapPremiumToSubscription(false)).toEqual({ state: "free_active" });
  });

  it("resolves trial state when active entitlement is in trial period", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {
        entitlements: {
          active: {
            premium: {
              isActive: true,
              periodType: "TRIAL",
              expirationDate: "2026-06-01T00:00:00Z",
              productIdentifier: "fitaly_premium_monthly",
            },
          },
        },
      },
    });

    expect(subscription.state).toBe("premium_trial");
    expect(subscription.renewDate).toBe("2026-06-01T00:00:00Z");
  });

  it("resolves grace state when entitlement is active with billing issue", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {
        entitlements: {
          active: {
            premium: {
              isActive: true,
              billingIssueDetectedAt: "2026-05-01T00:00:00Z",
              periodType: "NORMAL",
            },
          },
        },
      },
    });

    expect(subscription.state).toBe("premium_grace");
  });

  it("resolves pending downgrade state for active non-renewing entitlement", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {
        entitlements: {
          active: {
            premium: {
              isActive: true,
              willRenew: false,
              unsubscribeDetectedAt: "2026-05-04T00:00:00Z",
            },
          },
        },
      },
    });

    expect(subscription.state).toBe("premium_pending_downgrade");
  });

  it("resolves paused state when entitlement is inactive with billing issue", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {
        entitlements: {
          all: {
            premium: {
              isActive: false,
              billingIssueDetectedAt: "2026-05-01T00:00:00Z",
            },
          },
        },
      },
    });

    expect(subscription.state).toBe("premium_paused");
  });

  it("resolves refunded state when inactive entitlement has no renewal and no expiry", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {
        entitlements: {
          all: {
            premium: {
              isActive: false,
              willRenew: false,
              productIdentifier: "fitaly_premium_monthly",
              latestPurchaseDate: "2026-04-10T00:00:00Z",
            },
          },
        },
      },
    });

    expect(subscription.state).toBe("premium_refunded");
  });

  it("resolves expired state when premium history exists but entitlement is inactive", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {
        entitlements: {
          all: {
            premium: {
              isActive: false,
              expirationDate: "2026-04-01T00:00:00Z",
            },
          },
        },
      },
    });

    expect(subscription.state).toBe("premium_expired");
  });

  it("does not grant premium access when revenuecat payload is missing", () => {
    const subscription = resolveSubscriptionFromRevenueCat({
      customerInfo: {},
    });

    expect(subscription.state).toBe("free_active");
  });

  it("maps unknown subscription as a display-only degraded state", () => {
    expect(mapUnknownSubscription()).toEqual({
      state: "unknown",
    });
    expect(hasPremiumAccess("unknown")).toBe(false);
  });

  it("grants premium access only to active premium states", () => {
    expect(hasPremiumAccess("premium_active")).toBe(true);
    expect(hasPremiumAccess("premium_trial")).toBe(true);
    expect(hasPremiumAccess("premium_grace")).toBe(true);
    expect(hasPremiumAccess("premium_pending_downgrade")).toBe(true);
    expect(hasPremiumAccess("premium_expired")).toBe(false);
    expect(hasPremiumAccess("premium_paused")).toBe(false);
    expect(hasPremiumAccess("premium_refunded")).toBe(false);
    expect(hasPremiumAccess("free_active")).toBe(false);
  });
});
