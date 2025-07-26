import React, { createContext, useContext, useEffect } from "react";
import { usePremiumStatus } from "@/src/hooks/usePremiumStatus";

const PremiumContext = createContext({
  isPremium: null as boolean | null,
});

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isPremium, checkPremiumStatus, subscribeToPremiumChanges } =
    usePremiumStatus();

  useEffect(() => {
    checkPremiumStatus();
    subscribeToPremiumChanges(() => {
      checkPremiumStatus();
    });
  }, [checkPremiumStatus]);

  return (
    <PremiumContext.Provider value={{ isPremium }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremiumContext = () => useContext(PremiumContext);
