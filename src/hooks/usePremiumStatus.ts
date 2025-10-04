import { useState, useCallback } from "react";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";

const PREMIUM_KEY = "premium_status";
const DEV_FORCE_KEY = "dev_force_premium";
const keyFor = (uid?: string | null) =>
  uid ? `${PREMIUM_KEY}:${uid}` : PREMIUM_KEY;

export function usePremiumStatus() {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, any>;
  const forcePremium = !!extra.forcePremium;
  const billingDisabled = !!extra.disableBilling || !Device.isDevice;
  const getDevOverride = async () => {
    const raw = await AsyncStorage.getItem(DEV_FORCE_KEY);
    if (raw === "true" || raw === "false") return raw; // explicit override
    return null;
  };

  const checkPremiumStatus = useCallback(
    async (uid?: string | null) => {
      const devOverride = await getDevOverride();
      if (devOverride === "true") {
        await AsyncStorage.setItem(keyFor(uid), "true");
        setIsPremium(true);
        return true;
      }
      if (devOverride === "false") {
        await AsyncStorage.setItem(keyFor(uid), "false");
        setIsPremium(false);
        return false;
      }
      if (forcePremium) {
        await AsyncStorage.setItem(keyFor(uid), "true");
        setIsPremium(true);
        return true;
      }
      if (billingDisabled) {
        const cached = await AsyncStorage.getItem(keyFor(uid));
        // default to false if not set
        const fromCache = cached === "true" ? true : false;
        await AsyncStorage.setItem(keyFor(uid), fromCache ? "true" : "false");
        setIsPremium(fromCache);
        return fromCache;
      }
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
    },
    [forcePremium, billingDisabled]
  );

  const subscribeToPremiumChanges = useCallback(
    (
      uid?: string | null,
      onChange?: (premium: boolean) => void
    ): (() => void) => {
      // Avoid attaching live RC listeners when forced or on devices without billing
      // Note: devForce is read in checkPremiumStatus; listener is not required here
      if (forcePremium || billingDisabled) {
        // No live updates when forced or billing disabled
        return () => {};
      }
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
    [forcePremium, billingDisabled]
  );

  return {
    isPremium,
    setIsPremium,
    checkPremiumStatus,
    subscribeToPremiumChanges,
  };
}
