import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuthContext } from "@/context/AuthContext";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { useAccessContext } from "@/context/AccessContext";
import Purchases from "react-native-purchases";
import type { Subscription } from "@/types/subscription";
import { post } from "@/services/core/apiClient";
import {
  parseCreditsFromResponse,
  type AiCreditsResponse,
  type AiCreditsStatus,
} from "@/services/ai/contracts";
import {
  initRevenueCat,
  isBillingDisabled,
  isRevenueCatConfigured,
  rcLogIn,
  rcLogOut,
  rcSetAttributes,
} from "@/services/billing/revenuecat";
import {
  hasPremiumAccess,
  mapUnknownSubscription,
  mapPremiumToSubscription,
  resolveSubscriptionFromRevenueCat,
} from "@/services/billing/subscriptionStateMachine";
import { logWarning } from "@/services/core/errorLogger";

type PremiumContextType = {
  isPremium: boolean | null;
  subscription: Subscription | null;
  refreshPremium: () => Promise<boolean>;
  confirmPremiumEntitlement: () => Promise<{
    confirmed: boolean;
    reason?: "credits_not_premium" | "sync_tier_failed";
  }>;
};

const PREMIUM_ACTIVE_REFRESH_THROTTLE_MS = 30_000;
const PREMIUM_SYNC_TIER_TTL_MS = 15 * 60_000;

type SyncTierPolicy = "force" | "if-stale";

const PremiumContext = createContext<PremiumContextType>({
  isPremium: null,
  subscription: null,
  refreshPremium: async () => false,
  confirmPremiumEntitlement: async () => ({ confirmed: false }),
});

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid, email } = useAuthContext();
  const { applyCreditsFromResponse } = useAiCreditsContext();
  const { applyAccessFromResponse, refreshAccess } = useAccessContext();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const isPremiumRef = useRef<boolean | null>(null);
  const lastActiveRefreshAtRef = useRef(0);
  const lastSyncTierAtRef = useRef(0);
  const accessRefreshInFlightRef = useRef<{
    uid: string | null;
    promise: Promise<boolean>;
  } | null>(null);
  const entitlementConfirmationInFlightRef = useRef<Promise<{
    confirmed: boolean;
    reason?: "credits_not_premium" | "sync_tier_failed";
  }> | null>(null);

  const setSubscriptionState = useCallback((next: Subscription) => {
    const premium = hasPremiumAccess(next.state);
    isPremiumRef.current = premium;
    setIsPremium(premium);
    setSubscription(next);
  }, []);

  const setSubscriptionFromPremium = useCallback((premium: boolean) => {
    setSubscriptionState(mapPremiumToSubscription(premium));
  }, [setSubscriptionState]);

  const setSubscriptionUnknown = useCallback(() => {
    isPremiumRef.current = null;
    setIsPremium(null);
    setSubscription(mapUnknownSubscription());
  }, []);

  const applyBackendCreditsPremium = useCallback(
    (credits: AiCreditsStatus | null): boolean => {
      if (!credits) {
        setSubscriptionUnknown();
        return false;
      }
      const premium = credits.tier === "premium";
      setSubscriptionFromPremium(premium);
      return premium;
    },
    [setSubscriptionFromPremium, setSubscriptionUnknown],
  );

  const setSubscriptionFromRevenueCat = useCallback((input: {
    customerInfo: unknown;
  }): { confirmedAccess: boolean } => {
    const resolved = resolveSubscriptionFromRevenueCat({
      customerInfo: input.customerInfo,
    });
    const revenueCatPremium = hasPremiumAccess(resolved.state);
    if (revenueCatPremium) {
      setSubscriptionUnknown();
      return { confirmedAccess: false };
    }
    setSubscriptionState(resolved);
    return { confirmedAccess: false };
  }, [setSubscriptionState, setSubscriptionUnknown]);

  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    if (!uid) {
      setSubscriptionFromPremium(false);
      return false;
    }

    if (isBillingDisabled()) {
      setSubscriptionUnknown();
      return false;
    }

    initRevenueCat();

    if (!isRevenueCatConfigured()) {
      setSubscriptionUnknown();
      return false;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const resolved = setSubscriptionFromRevenueCat({
        customerInfo: info,
      });
      return resolved.confirmedAccess;
    } catch (error) {
      logWarning("premium status check failed", null, error);
      setSubscriptionUnknown();
      return false;
    }
  }, [
    setSubscriptionFromPremium,
    setSubscriptionFromRevenueCat,
    setSubscriptionUnknown,
    uid,
  ]);

  const shouldRunSyncTier = useCallback((policy: SyncTierPolicy): boolean => {
    if (policy === "force") return true;
    return Date.now() - lastSyncTierAtRef.current >= PREMIUM_SYNC_TIER_TTL_MS;
  }, []);

  const confirmPremiumEntitlement = useCallback((): Promise<{
    confirmed: boolean;
    reason?: "credits_not_premium" | "sync_tier_failed";
  }> => {
    const inFlight = entitlementConfirmationInFlightRef.current;
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      if (!uid) {
        setSubscriptionFromPremium(false);
        return { confirmed: false, reason: "sync_tier_failed" as const };
      }

      if (accessRefreshInFlightRef.current?.uid === uid) {
        await accessRefreshInFlightRef.current.promise;
      }

      let credits: AiCreditsStatus | null = null;
      try {
        const syncedResponse = await post<AiCreditsResponse>("/ai/credits/sync-tier");
        lastSyncTierAtRef.current = Date.now();
        credits = parseCreditsFromResponse(syncedResponse);
        if (!credits) {
          const access = await refreshAccess();
          credits = access?.credits ?? null;
        } else {
          applyCreditsFromResponse(syncedResponse);
          applyAccessFromResponse(syncedResponse);
        }
      } catch (error) {
        logWarning("premium entitlement confirmation sync failed", null, error);
        setSubscriptionFromPremium(false);
        return { confirmed: false, reason: "sync_tier_failed" as const };
      }

      const confirmed = applyBackendCreditsPremium(credits);
      return {
        confirmed,
        ...(confirmed ? {} : { reason: "credits_not_premium" as const }),
      };
    })().finally(() => {
      if (entitlementConfirmationInFlightRef.current === promise) {
        entitlementConfirmationInFlightRef.current = null;
      }
    });

    entitlementConfirmationInFlightRef.current = promise;
    return promise;
  }, [
    applyBackendCreditsPremium,
    applyAccessFromResponse,
    applyCreditsFromResponse,
    refreshAccess,
    setSubscriptionFromPremium,
    uid,
  ]);

  const runAccessRefresh = useCallback(
    (params: { syncTier: SyncTierPolicy }): Promise<boolean> => {
      const requestUid = uid;
      const inFlight = accessRefreshInFlightRef.current;
      if (inFlight?.uid === requestUid) {
        return inFlight.promise;
      }

      const promise = (async () => {
        if (!requestUid) {
          setSubscriptionFromPremium(false);
          return false;
        }

        await checkPremiumStatus();

        let credits: AiCreditsStatus | null = null;
        if (shouldRunSyncTier(params.syncTier)) {
          try {
            const syncedResponse = await post<AiCreditsResponse>("/ai/credits/sync-tier");
            lastSyncTierAtRef.current = Date.now();
            credits = parseCreditsFromResponse(syncedResponse);
            if (credits) {
              applyCreditsFromResponse(syncedResponse);
              applyAccessFromResponse(syncedResponse);
            }
          } catch (error) {
            logWarning("ai credits tier sync failed", null, error);
          }
        }

        if (!credits) {
          const access = await refreshAccess();
          credits = access?.credits ?? null;
        }
        if (credits) {
          return applyBackendCreditsPremium(credits);
        }
        return isPremiumRef.current === true;
      })().finally(() => {
        if (accessRefreshInFlightRef.current?.promise === promise) {
          accessRefreshInFlightRef.current = null;
        }
      });

      accessRefreshInFlightRef.current = { uid: requestUid, promise };
      return promise;
    },
    [
      applyBackendCreditsPremium,
      applyAccessFromResponse,
      applyCreditsFromResponse,
      checkPremiumStatus,
      refreshAccess,
      setSubscriptionFromPremium,
      shouldRunSyncTier,
      uid,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (uid) {
          await rcLogIn(uid);
        } else {
          await rcLogOut();
        }
      } finally {
        if (!cancelled) {
          await runAccessRefresh({ syncTier: "force" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    uid,
    checkPremiumStatus,
    runAccessRefresh,
  ]);

  useEffect(() => {
    if (!uid || !email) return;
    void rcSetAttributes({
      email,
      locale: Intl.DateTimeFormat().resolvedOptions().locale || "en",
    });
  }, [uid, email]);

  const refreshPremium = useCallback(
    async () => {
      return runAccessRefresh({ syncTier: "force" });
    },
    [
      runAccessRefresh,
    ],
  );

  const refreshPremiumIfStale = useCallback(async (): Promise<void> => {
    const now = Date.now();
    if (now - lastActiveRefreshAtRef.current < PREMIUM_ACTIVE_REFRESH_THROTTLE_MS) {
      return;
    }
    lastActiveRefreshAtRef.current = now;
    await runAccessRefresh({ syncTier: "if-stale" });
  }, [runAccessRefresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPremiumIfStale();
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshPremiumIfStale]);

  const value = useMemo(
    () => ({
      isPremium,
      subscription,
      refreshPremium,
      confirmPremiumEntitlement,
    }),
    [
      isPremium,
      subscription,
      refreshPremium,
      confirmPremiumEntitlement,
    ],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
};

export const usePremiumContext = () => useContext(PremiumContext);
