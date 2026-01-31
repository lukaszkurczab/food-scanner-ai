import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
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
  refreshPremium: () => Promise<boolean>;
};

const PremiumContext = createContext<PremiumContextType>({
  isPremium: null,
  setDevPremium: async () => {},
  refreshPremium: async () => false,
});

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid, email } = useAuthContext();
  const { isPremium, checkPremiumStatus } = usePremiumStatus(uid);

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

  const refreshPremium = useCallback(
    () => checkPremiumStatus(),
    [checkPremiumStatus],
  );

  const setDevPremium = useCallback(
    async (enabled: boolean) => {
      try {
        await AsyncStorage.setItem(
          "dev_force_premium",
          enabled ? "true" : "false",
        );
        await AsyncStorage.setItem(
          `premium_status:${uid ?? "anon"}`,
          enabled ? "true" : "false",
        );
      } catch {}
      await checkPremiumStatus();
    },
    [uid, checkPremiumStatus],
  );

  const value = useMemo(
    () => ({ isPremium, setDevPremium, refreshPremium }),
    [isPremium, setDevPremium, refreshPremium],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
};

export const usePremiumContext = () => useContext(PremiumContext);
