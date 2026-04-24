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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthContext } from "@/context/AuthContext";
import { get } from "@/services/core/apiClient";
import {
  parseCreditTransactionsResponse,
  parseCreditsFromResponse,
  type AiCreditTransactionItem,
  type AiCreditsAction,
  type AiCreditsResponse,
  type AiCreditsStatus,
} from "@/services/ai/contracts";
import { logWarning } from "@/services/core/errorLogger";

type AiCreditsContextValue = {
  credits: AiCreditsStatus | null;
  loading: boolean;
  refreshCredits: () => Promise<AiCreditsStatus | null>;
  refreshCreditTransactions: (limit?: number) => Promise<AiCreditTransactionItem[]>;
  applyCreditsFromResponse: (value: unknown) => AiCreditsStatus | null;
  canAfford: (action: AiCreditsAction) => boolean;
};

const AiCreditsContext = createContext<AiCreditsContextValue>({
  credits: null,
  loading: false,
  refreshCredits: async () => null,
  refreshCreditTransactions: async () => [],
  applyCreditsFromResponse: () => null,
  canAfford: () => false,
});
const APP_ACTIVE_REFRESH_THROTTLE_MS = 30_000;

function getActionCost(credits: AiCreditsStatus, action: AiCreditsAction): number {
  return credits.costs[action];
}

function creditsChanged(a: AiCreditsStatus | null, b: AiCreditsStatus | null): boolean {
  if (a === b) return false;
  if (!a || !b) return true;
  return a.balance !== b.balance || a.tier !== b.tier || a.allocation !== b.allocation
    || a.periodStartAt !== b.periodStartAt || a.periodEndAt !== b.periodEndAt;
}

function creditsStorageKey(uid: string): string {
  return `ai_credits:${uid}`;
}

export const AiCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { uid } = useAuthContext();
  const [credits, setCredits] = useState<AiCreditsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const creditsRef = useRef(credits);
  const lastActiveRefreshAtRef = useRef(0);
  const uidRef = useRef(uid);
  const refreshInFlightRef = useRef<{
    uid: string;
    token: object;
    promise: Promise<AiCreditsStatus | null>;
  } | null>(null);

  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);

  const updateCredits = useCallback((next: AiCreditsStatus | null) => {
    if (!creditsChanged(creditsRef.current, next)) return;
    creditsRef.current = next;
    setCredits(next);
  }, []);

  const applyCreditsFromResponse = useCallback((value: unknown): AiCreditsStatus | null => {
    const parsed = parseCreditsFromResponse(value);
    if (!parsed) return null;
    updateCredits(parsed);
    if (uid) {
      AsyncStorage
        .setItem(creditsStorageKey(uid), JSON.stringify(parsed))
        .catch((error) => {
          logWarning("ai credits cache write failed", null, error);
          return undefined;
        });
    }
    return parsed;
  }, [uid, updateCredits]);

  const refreshCredits = useCallback((): Promise<AiCreditsStatus | null> => {
    if (!uid) {
      updateCredits(null);
      return Promise.resolve(null);
    }

    const inFlight = refreshInFlightRef.current;
    if (inFlight?.uid === uid) {
      return inFlight.promise;
    }

    setLoading(true);
    const requestUid = uid;
    const token = {};
    const promise = (async () => {
      try {
        const response = await get<AiCreditsResponse>("/ai/credits");
        const parsed = parseCreditsFromResponse(response);
        if (!parsed) return null;
        if (uidRef.current !== requestUid) return parsed;
        updateCredits(parsed);
        await AsyncStorage
          .setItem(creditsStorageKey(requestUid), JSON.stringify(parsed))
          .catch((error) => {
            logWarning("ai credits cache write failed", null, error);
            return undefined;
          });
        return parsed;
      } catch (error) {
        logWarning("ai credits refresh failed", null, error);
        return null;
      } finally {
        if (refreshInFlightRef.current?.token === token) {
          refreshInFlightRef.current = null;
          setLoading(false);
        }
      }
    })();
    refreshInFlightRef.current = { uid: requestUid, token, promise };
    return promise;
  }, [uid, updateCredits]);

  const refreshCreditTransactions = useCallback(async (limit = 50) => {
    if (!uid) return [];
    try {
      const response = await get(`/ai/credits/transactions?limit=${Math.min(Math.max(limit, 1), 200)}`);
      return parseCreditTransactionsResponse(response)?.items ?? [];
    } catch (error) {
      logWarning("ai credits transaction history refresh failed", null, error);
      return [];
    }
  }, [uid]);

  const refreshCreditsIfStale = useCallback(async (): Promise<AiCreditsStatus | null> => {
    const now = Date.now();
    if (now - lastActiveRefreshAtRef.current < APP_ACTIVE_REFRESH_THROTTLE_MS) {
      return creditsRef.current;
    }
    lastActiveRefreshAtRef.current = now;
    return refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      updateCredits(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(creditsStorageKey(uid));
        if (!cached || cancelled) return;
        const parsed = parseCreditsFromResponse(JSON.parse(cached));
        if (parsed) updateCredits(parsed);
      } catch (error) {
        logWarning("ai credits cache restore failed", null, error);
        // Ignore malformed local cache for credits snapshot.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, updateCredits]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshCreditsIfStale();
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshCreditsIfStale]);

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
      refreshCreditTransactions,
      applyCreditsFromResponse,
      canAfford,
    }),
    [
      credits,
      loading,
      refreshCredits,
      refreshCreditTransactions,
      applyCreditsFromResponse,
      canAfford,
    ],
  );

  return (
    <AiCreditsContext.Provider value={value}>{children}</AiCreditsContext.Provider>
  );
};

export function useAiCreditsContext(): AiCreditsContextValue {
  return useContext(AiCreditsContext);
}
