import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumStatus } from "@hooks/usePremiumStatus";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  rcLogIn,
  rcLogOut,
  rcSetAttributes,
} from "@/feature/Subscription/services/revenuecat";

type PremiumContextType = {
  isPremium: boolean | null;
  setDevPremium: (enabled: boolean) => Promise<void>;
};

const PremiumContext = createContext<PremiumContextType>({
  isPremium: null,
  setDevPremium: async () => {},
});

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid, email } = useAuthContext();
  const { isPremium, checkPremiumStatus, subscribeToPremiumChanges } =
    usePremiumStatus();

  useEffect(() => {
    checkPremiumStatus(uid);
    const unsub = subscribeToPremiumChanges(uid, () => {});
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [uid, checkPremiumStatus, subscribeToPremiumChanges]);

  useEffect(() => {
    (async () => {
      if (uid) {
        await rcLogIn(uid);
        await rcSetAttributes({
          email: email ?? null,
          locale: Intl.DateTimeFormat().resolvedOptions().locale || "en",
        });
      } else {
        await rcLogOut();
      }
    })();
  }, [uid, email]);

  const setDevPremium = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(
        "dev_force_premium",
        enabled ? "true" : "false"
      );
      const key = uid ? `premium_status:${uid}` : "premium_status";
      await AsyncStorage.setItem(key, enabled ? "true" : "false");
    } catch {}
    await checkPremiumStatus(uid);
  };

  const value = useMemo(() => ({ isPremium, setDevPremium }), [isPremium]);

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
};

export const usePremiumContext = () => useContext(PremiumContext);
