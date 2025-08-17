import { useState, useCallback } from "react";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_KEY = "premium_status";
const keyFor = (uid?: string | null) =>
  uid ? `${PREMIUM_KEY}:${uid}` : PREMIUM_KEY;

export function usePremiumStatus() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const checkPremiumStatus = useCallback(async (uid?: string | null) => {
    try {
      const info = await Purchases.getCustomerInfo();
      const premium = !!info.entitlements.active["premium"];
      await AsyncStorage.setItem(keyFor(uid), JSON.stringify(premium));
      setIsPremium(premium);
      return premium;
    } catch {
      const cached = await AsyncStorage.getItem(keyFor(uid));
      const fromCache = cached === "true";
      setIsPremium(fromCache);
      return fromCache;
    }
  }, []);

  const subscribeToPremiumChanges = useCallback(
    (
      uid?: string | null,
      onChange?: (premium: boolean) => void
    ): (() => void) => {
      const listener = async (info: any) => {
        const premium = !!info.entitlements.active["premium"];
        await AsyncStorage.setItem(keyFor(uid), JSON.stringify(premium));
        setIsPremium(premium);
        onChange?.(premium);
      };
      Purchases.addCustomerInfoUpdateListener(listener);
      return () => {
        try {
          Purchases.removeCustomerInfoUpdateListener?.(listener);
        } catch {}
      };
    },
    []
  );

  return {
    isPremium,
    setIsPremium,
    checkPremiumStatus,
    subscribeToPremiumChanges,
  };
}
