import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuthContext } from "@/context/AuthContext";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Subscription } from "@/types/subscription";
import {
  initRevenueCat,
  isBillingDisabled,
  isRevenueCatConfigured,
  rcLogIn,
  rcLogOut,
  rcSetAttributes,
} from "@/services/billing/revenuecat";

type PremiumContextType = {
  isPremium: boolean | null;
  subscription: Subscription | null;
  setDevPremium: (enabled: boolean) => Promise<void>;
  refreshPremium: () => Promise<boolean>;
};

function mapToSubscription(premium: boolean): Subscription {
  return premium ? { state: "premium_active" } : { state: "free_active" };
}

async function readCachedPremiumStatus(
  premiumKey: string,
): Promise<boolean | null> {
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
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const premiumKey = `premium_status:${uid ?? "anon"}`;

  const setSubscriptionFromPremium = useCallback((premium: boolean) => {
    setIsPremium(premium);
    setSubscription(mapToSubscription(premium));
  }, []);

  const checkPremiumStatus = useCallback(async (): Promise<boolean> => {
    if (isBillingDisabled()) {
      const cached = await readCachedPremiumStatus(premiumKey);
      const val = cached ?? false;
      setSubscriptionFromPremium(val);
      return val;
    }

    initRevenueCat();

    if (!isRevenueCatConfigured()) {
      setSubscriptionFromPremium(false);
      return false;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const premium = !!info.entitlements.active["premium"];
      await AsyncStorage.setItem(premiumKey, premium ? "true" : "false");
      setSubscriptionFromPremium(premium);
      return premium;
    } catch {
      const cached = await readCachedPremiumStatus(premiumKey);
      if (cached !== null) {
        setSubscriptionFromPremium(cached);
        return cached;
      }
      setSubscriptionFromPremium(false);
      return false;
    }
  }, [premiumKey, setSubscriptionFromPremium]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (uid) {
          await rcLogIn(uid);
          await rcSetAttributes({
            email: email ?? null,
            locale: Intl.DateTimeFormat().resolvedOptions().locale || "en",
          });
        } else {
          await rcLogOut();
        }
      } finally {
        if (!cancelled) {
          await checkPremiumStatus();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, email, checkPremiumStatus]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void checkPremiumStatus();
      }
    });

    return () => {
      sub.remove();
    };
  }, [checkPremiumStatus]);

  const refreshPremium = useCallback(
    () => checkPremiumStatus(),
    [checkPremiumStatus],
  );

  const setDevPremium = useCallback(
    async (enabled: boolean) => {
      await AsyncStorage
        .multiSet([
          ["dev_force_premium", enabled ? "true" : "false"],
          [premiumKey, enabled ? "true" : "false"],
        ])
        .catch(() => undefined);
      setSubscriptionFromPremium(enabled);
      await checkPremiumStatus();
    },
    [premiumKey, checkPremiumStatus, setSubscriptionFromPremium],
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
