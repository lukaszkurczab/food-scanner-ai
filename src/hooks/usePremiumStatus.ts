import { useState, useEffect } from "react";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_KEY = "premium_status";

export function usePremiumStatus() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const info = await Purchases.getCustomerInfo();
        const premium = !!info.entitlements.active["premium"];
        await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(premium));
        if (!cancelled) setIsPremium(premium);
      } catch (err) {
        const cached = await AsyncStorage.getItem(PREMIUM_KEY);
        if (!cancelled) setIsPremium(cached === "true");
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return isPremium;
}
