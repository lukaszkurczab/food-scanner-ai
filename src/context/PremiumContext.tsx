import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { usePremiumStatus } from "@hooks/usePremiumStatus";

type PremiumContextType = {
  isPremium: boolean | null;
};

const PremiumContext = createContext<PremiumContextType>({ isPremium: null });

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid } = useAuthContext();
  const { isPremium, checkPremiumStatus, subscribeToPremiumChanges } =
    usePremiumStatus();

  useEffect(() => {
    // po zmianie usera — sprawdź i zasubskrybuj per-user
    checkPremiumStatus(uid);
    const unsub = subscribeToPremiumChanges(uid, () => {
      // opcjonalny refresh; najczęściej niepotrzebny, bo listener już ustawia stan
      // checkPremiumStatus(uid);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [uid, checkPremiumStatus, subscribeToPremiumChanges]);

  const value = useMemo(() => ({ isPremium }), [isPremium]);

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
};

export const usePremiumContext = () => useContext(PremiumContext);
