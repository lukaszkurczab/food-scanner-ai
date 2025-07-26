import { useState, useCallback } from "react";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_KEY = "premium_status";

export function usePremiumStatus() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const checkPremiumStatus = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      const premium = !!info.entitlements.active["premium"];
      await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(premium));
      setIsPremium(premium);
    } catch {
      const cached = await AsyncStorage.getItem(PREMIUM_KEY);
      setIsPremium(cached === "true");
    }
  }, []);

  const subscribeToPremiumChanges = useCallback((callback: () => void) => {
    return Purchases.addCustomerInfoUpdateListener(callback);
  }, []);

  return {
    isPremium,
    setIsPremium,
    checkPremiumStatus,
    subscribeToPremiumChanges,
  };
}
