import { useCallback, useEffect, useRef, useState } from "react";
import { on } from "@/services/core/events";
import {
  createFallbackNutritionState,
  getCurrentNutritionStateDayKey,
  getNutritionState,
  invalidateNutritionStateCache,
  refreshNutritionState,
} from "@/services/nutritionState/nutritionStateService";
import type {
  NutritionState,
  NutritionStateSource,
} from "@/services/nutritionState/nutritionStateTypes";

type UseNutritionStateParams = {
  uid: string | null | undefined;
  dayKey?: string | null;
};

type UseNutritionStateResult = {
  state: NutritionState;
  loading: boolean;
  enabled: boolean;
  source: NutritionStateSource;
  isStale: boolean;
  error: unknown | null;
  refresh: () => Promise<NutritionState>;
};

function resolveDayKey(dayKey?: string | null): string {
  return dayKey?.trim() || getCurrentNutritionStateDayKey();
}

type NutritionStateMutationEvent = {
  uid?: string | null;
};

export function useNutritionState({
  uid,
  dayKey,
}: UseNutritionStateParams): UseNutritionStateResult {
  const resolvedDayKey = resolveDayKey(dayKey);
  const [state, setState] = useState<NutritionState>(() =>
    createFallbackNutritionState(resolvedDayKey),
  );
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [source, setSource] = useState<NutritionStateSource>("fallback");
  const [isStale, setIsStale] = useState<boolean>(true);
  const [error, setError] = useState<unknown | null>(null);
  const requestIdRef = useRef(0);
  const requestScopeKey = `${uid ?? ""}:${resolvedDayKey}`;
  const requestScopeKeyRef = useRef(requestScopeKey);

  useEffect(() => {
    requestScopeKeyRef.current = requestScopeKey;
    requestIdRef.current += 1;
  }, [requestScopeKey]);

  const applyResult = useCallback((result: {
    state: NutritionState;
    enabled: boolean;
    source: NutritionStateSource;
    isStale: boolean;
    error: unknown | null;
  }) => {
    setState(result.state);
    setEnabled(result.enabled);
    setSource(result.source);
    setIsStale(result.isStale);
    setError(result.error);
  }, []);

  useEffect(() => {
    let active = true;

    if (!uid) {
      setState(createFallbackNutritionState(resolvedDayKey));
      setLoading(false);
      setEnabled(true);
      setSource("fallback");
      setIsStale(true);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const requestScope = requestScopeKey;

    void getNutritionState(uid, { dayKey: resolvedDayKey }).then((result) => {
      if (
        !active ||
        requestIdRef.current !== requestId ||
        requestScopeKeyRef.current !== requestScope
      ) {
        return;
      }

      applyResult(result);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [applyResult, requestScopeKey, uid, resolvedDayKey]);

  useEffect(() => {
    if (!uid) {
      return () => undefined;
    }

    let active = true;

    const handleMealMutation = (event?: NutritionStateMutationEvent) => {
      if (!active || event?.uid !== uid) {
        return;
      }

      setLoading(true);
      void (async () => {
        const requestId = ++requestIdRef.current;
        const requestScope = requestScopeKey;
        await invalidateNutritionStateCache(uid, { dayKey: resolvedDayKey });
        const result = await refreshNutritionState(uid, { dayKey: resolvedDayKey });
        if (
          !active ||
          requestIdRef.current !== requestId ||
          requestScopeKeyRef.current !== requestScope
        ) {
          return;
        }
        applyResult(result);
        setLoading(false);
      })();
    };

    const unsubscribers = [
      on<NutritionStateMutationEvent>("meal:added", handleMealMutation),
      on<NutritionStateMutationEvent>("meal:updated", handleMealMutation),
      on<NutritionStateMutationEvent>("meal:deleted", handleMealMutation),
    ];

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [applyResult, requestScopeKey, resolvedDayKey, uid]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const requestScope = requestScopeKey;
    const result = await refreshNutritionState(uid, { dayKey: resolvedDayKey });
    if (
      requestIdRef.current === requestId &&
      requestScopeKeyRef.current === requestScope
    ) {
      applyResult(result);
      setLoading(false);
    }
    return result.state;
  }, [applyResult, requestScopeKey, uid, resolvedDayKey]);

  return {
    state,
    loading,
    enabled,
    source,
    isStale,
    error,
    refresh,
  };
}
