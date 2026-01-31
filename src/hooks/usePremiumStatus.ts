import { useState, useCallback } from "react";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initRevenueCat,
  isRevenueCatConfigured,
  isBillingDisabled,
} from "@/feature/Subscription";

export function usePremiumStatus(uid?: string | null) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const premiumKey = `premium_status:${uid ?? "anon"}`;

  const checkPremiumStatus = useCallback(async () => {
    if (isBillingDisabled()) {
      const cached = await AsyncStorage.getItem(premiumKey);
      const val = cached === "true";
      setIsPremium(val);
      return val;
    }

    initRevenueCat();

    if (!isRevenueCatConfigured()) {
      setIsPremium(false);
      return false;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const premium = !!info.entitlements.active["premium"];
      await AsyncStorage.setItem(premiumKey, premium ? "true" : "false");
      setIsPremium(premium);
      return premium;
    } catch {
      setIsPremium(false);
      return false;
    }
  }, [premiumKey]);

  return { isPremium, checkPremiumStatus };
}
