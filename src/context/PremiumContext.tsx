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
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Subscription } from "@/types/subscription";
import { post } from "@/services/core/apiClient";
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
  mapPremiumToSubscription,
  resolveSubscriptionFromRevenueCat,
} from "@/services/billing/subscriptionStateMachine";
import { logWarning } from "@/services/core/errorLogger";
import { trackPremiumStateEvaluated } from "@/services/telemetry/telemetryInstrumentation";

type PremiumContextType = {
  isPremium: boolean | null;
  subscription: Subscription | null;
  setDevPremium: (enabled: boolean) => Promise<void>;
  refreshPremium: () => Promise<boolean>;
};

type PremiumCacheState = "not_applicable" | "hit_true" | "hit_false" | "miss";

const PREMIUM_ACTIVE_REFRESH_THROTTLE_MS = 30_000;

function toPremiumCacheState(cached: boolean | null): PremiumCacheState {
  if (cached === true) return "hit_true";
  if (cached === false) return "hit_false";
  return "miss";
}

async function readCachedPremiumStatus(
  premiumKey: string | null,
): Promise<boolean | null> {
  if (!premiumKey) return null;
  const cached = await AsyncStorage.getItem(premiumKey);
  if (cached === "true") return true;
  if (cached === "false") return false;
  return null;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: null,
  subscription: null,
  setDevPremium: async () => {},
  refreshPremium: async () => false,
});

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid, email } = useAuthContext();
  const { refreshCredits } = useAiCreditsContext();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const premiumKey = uid ? `premium_status:${uid}` : null;
  const isPremiumRef = useRef<boolean | null>(null);
  const lastActiveRefreshAtRef = useRef(0);

  const setSubscriptionState = useCallback((next: Subscription) => {
    const premium = hasPremiumAccess(next.state);
    isPremiumRef.current = premium;
    setIsPremium(premium);
    setSubscription(next);
  }, []);

  const setSubscriptionFromPremium = useCallback((premium: boolean) => {
    setSubscriptionState(mapPremiumToSubscription(premium));
  }, [setSubscriptionState]);

  const setSubscriptionFromRevenueCat = useCallback((input: {
    customerInfo: unknown;
    fallbackPremium: boolean;
  }): boolean => {
    const resolved = resolveSubscriptionFromRevenueCat({
      customerInfo: input.customerInfo,
      fallbackPremium: input.fallbackPremium,
    });
    setSubscriptionState(resolved);
    return hasPremiumAccess(resolved.state);
  }, [setSubscriptionState]);

  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    if (!uid) {
      setSubscriptionFromPremium(false);
      void trackPremiumStateEvaluated({
        source: "logged_out",
        premium: false,
        cacheState: "not_applicable",
      });
      return false;
    }

    const cachedBefore = await readCachedPremiumStatus(premiumKey);
    const cacheState = toPremiumCacheState(cachedBefore);

    if (isBillingDisabled()) {
      const val = cachedBefore ?? false;
      setSubscriptionFromPremium(val);
      void trackPremiumStateEvaluated({
        source: "billing_disabled",
        premium: val,
        cacheState,
      });
      return val;
    }

    initRevenueCat();

    if (!isRevenueCatConfigured()) {
      setSubscriptionFromPremium(false);
      void trackPremiumStateEvaluated({
        source: "revenuecat_unconfigured",
        premium: false,
        cacheState,
      });
      return false;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const premium = setSubscriptionFromRevenueCat({
        customerInfo: info,
        fallbackPremium: cachedBefore ?? false,
      });
      if (premiumKey) {
        await AsyncStorage.setItem(premiumKey, premium ? "true" : "false");
      }
      void trackPremiumStateEvaluated({
        source: "customer_info",
        premium,
        cacheState,
        mismatch: cachedBefore !== null ? cachedBefore !== premium : undefined,
      });
      return premium;
    } catch (error) {
      logWarning("premium status check failed", null, error);
      if (cachedBefore !== null) {
        setSubscriptionFromPremium(cachedBefore);
        void trackPremiumStateEvaluated({
          source: "cache_fallback",
          premium: cachedBefore,
          cacheState,
        });
        return cachedBefore;
      }
      setSubscriptionFromPremium(false);
      void trackPremiumStateEvaluated({
        source: "cache_fallback",
        premium: false,
        cacheState: "miss",
      });
      return false;
    }
  }, [
    premiumKey,
    setSubscriptionFromPremium,
    setSubscriptionFromRevenueCat,
    uid,
  ]);

  const syncTierAndRefreshCredits = useCallback(async (): Promise<void> => {
    let syncTierFailed = false;
    if (uid) {
      try {
        await post("/ai/credits/sync-tier");
      } catch (error) {
        syncTierFailed = true;
        logWarning("ai credits tier sync failed", null, error);
        // Keep local premium status and fallback to normal credits refresh.
      }
    }

    const refreshed = await refreshCredits();
    const premiumNow = isPremiumRef.current;
    if (premiumNow === null) {
      return;
    }

    const expectedTier = premiumNow ? "premium" : "free";
    const actualTier = refreshed?.tier ?? "unknown";
    const mismatch =
      syncTierFailed
      || (actualTier !== "unknown" && actualTier !== expectedTier);
    if (!mismatch) {
      return;
    }

    void trackPremiumStateEvaluated({
      source: "sync_validation",
      premium: premiumNow,
      cacheState: "not_applicable",
      mismatch: true,
      creditsTier: actualTier,
    });
  }, [refreshCredits, uid]);

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
          await checkPremiumStatus();
          await syncTierAndRefreshCredits();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, checkPremiumStatus, syncTierAndRefreshCredits]);

  useEffect(() => {
    if (!uid || !email) return;
    void rcSetAttributes({
      email,
      locale: Intl.DateTimeFormat().resolvedOptions().locale || "en",
    });
  }, [uid, email]);

  const refreshPremium = useCallback(
    async () => {
      const premium = await checkPremiumStatus();
      await syncTierAndRefreshCredits();
      return premium;
    },
    [checkPremiumStatus, syncTierAndRefreshCredits],
  );

  const refreshPremiumIfStale = useCallback(async (): Promise<void> => {
    const now = Date.now();
    if (now - lastActiveRefreshAtRef.current < PREMIUM_ACTIVE_REFRESH_THROTTLE_MS) {
      return;
    }
    lastActiveRefreshAtRef.current = now;
    await refreshPremium();
  }, [refreshPremium]);

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

  const setDevPremium = useCallback(
    async (enabled: boolean) => {
      const entries: [string, string][] = [
        ["dev_force_premium", enabled ? "true" : "false"],
      ];
      if (premiumKey) {
        entries.push([premiumKey, enabled ? "true" : "false"]);
      }
      await AsyncStorage
        .multiSet(entries)
        .catch((error) => {
          logWarning("premium dev flag save failed", null, error);
          return undefined;
        });
      setSubscriptionFromPremium(enabled);
      await refreshPremium();
    },
    [premiumKey, refreshPremium, setSubscriptionFromPremium],
  );

  const value = useMemo(
    () => ({ isPremium, subscription, setDevPremium, refreshPremium }),
    [isPremium, subscription, setDevPremium, refreshPremium],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
};

export const usePremiumContext = () => useContext(PremiumContext);
