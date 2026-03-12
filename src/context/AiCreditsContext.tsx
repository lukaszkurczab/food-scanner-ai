import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuthContext } from "@/context/AuthContext";
import { get } from "@/services/core/apiClient";
import {
  parseCreditsFromResponse,
  type AiCreditsAction,
  type AiCreditsResponse,
  type AiCreditsStatus,
} from "@/services/ai/contracts";

type AiCreditsContextValue = {
  credits: AiCreditsStatus | null;
  loading: boolean;
  refreshCredits: () => Promise<AiCreditsStatus | null>;
  applyCreditsFromResponse: (value: unknown) => AiCreditsStatus | null;
  canAfford: (action: AiCreditsAction) => boolean;
};

const AiCreditsContext = createContext<AiCreditsContextValue>({
  credits: null,
  loading: false,
  refreshCredits: async () => null,
  applyCreditsFromResponse: () => null,
  canAfford: () => false,
});

function getActionCost(credits: AiCreditsStatus, action: AiCreditsAction): number {
  return credits.costs[action];
}

function creditsChanged(a: AiCreditsStatus | null, b: AiCreditsStatus | null): boolean {
  if (a === b) return false;
  if (!a || !b) return true;
  return a.balance !== b.balance || a.tier !== b.tier || a.allocation !== b.allocation
    || a.periodStartAt !== b.periodStartAt || a.periodEndAt !== b.periodEndAt;
}

export const AiCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { uid } = useAuthContext();
  const [credits, setCredits] = useState<AiCreditsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const creditsRef = useRef(credits);

  const updateCredits = useCallback((next: AiCreditsStatus | null) => {
    if (!creditsChanged(creditsRef.current, next)) return;
    creditsRef.current = next;
    setCredits(next);
  }, []);

  const applyCreditsFromResponse = useCallback((value: unknown): AiCreditsStatus | null => {
    const parsed = parseCreditsFromResponse(value);
    if (!parsed) return null;
    updateCredits(parsed);
    return parsed;
  }, [updateCredits]);

  const refreshCredits = useCallback(async (): Promise<AiCreditsStatus | null> => {
    if (!uid) {
      updateCredits(null);
      return null;
    }

    setLoading(true);
    try {
      const response = await get<AiCreditsResponse>("/ai/credits");
      const parsed = parseCreditsFromResponse(response);
      if (!parsed) return null;
      updateCredits(parsed);
      return parsed;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [uid, updateCredits]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshCredits();
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshCredits]);

  const canAfford = useCallback(
    (action: AiCreditsAction) => {
      if (!credits) return false;
      return credits.balance >= getActionCost(credits, action);
    },
    [credits],
  );

  const value = useMemo<AiCreditsContextValue>(
    () => ({
      credits,
      loading,
      refreshCredits,
      applyCreditsFromResponse,
      canAfford,
    }),
    [credits, loading, refreshCredits, applyCreditsFromResponse, canAfford],
  );

  return (
    <AiCreditsContext.Provider value={value}>{children}</AiCreditsContext.Provider>
  );
};

export function useAiCreditsContext(): AiCreditsContextValue {
  return useContext(AiCreditsContext);
}
