import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumStatus } from "@hooks/usePremiumStatus";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const { uid } = useAuthContext();
  const { isPremium, checkPremiumStatus, subscribeToPremiumChanges } = usePremiumStatus();

  useEffect(() => {
    checkPremiumStatus(uid);
    const unsub = subscribeToPremiumChanges(uid, () => {});
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [uid, checkPremiumStatus, subscribeToPremiumChanges]);

  const setDevPremium = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem("dev_force_premium", enabled ? "true" : "false");
      // Also update cached premium flag for current user to reflect override immediately
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
