import { useCallback, useEffect, useState } from "react";
import {
  createFallbackNutritionState,
  getCurrentNutritionStateDayKey,
  getNutritionState,
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

    void getNutritionState(uid, { dayKey: resolvedDayKey }).then((result) => {
      if (!active) {
        return;
      }

      setState(result.state);
      setEnabled(result.enabled);
      setSource(result.source);
      setIsStale(result.isStale);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [uid, resolvedDayKey]);

  const refresh = useCallback(async () => {
    const result = await refreshNutritionState(uid, { dayKey: resolvedDayKey });
    setState(result.state);
    setEnabled(result.enabled);
    setSource(result.source);
    setIsStale(result.isStale);
    setError(result.error);
    setLoading(false);
    return result.state;
  }, [uid, resolvedDayKey]);

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

