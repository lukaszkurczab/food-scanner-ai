import { useCallback, useEffect, useRef, useState } from "react";
import { on } from "@/services/core/events";
import {
  createFallbackCoachResponse,
  getCoach,
  getCurrentCoachDayKey,
  invalidateCoachCache,
  refreshCoach,
} from "@/services/coach/coachService";
import type {
  CoachResponse,
  CoachResponseSource,
  CoachResultStatus,
} from "@/services/coach/coachTypes";

type UseCoachParams = {
  uid: string | null | undefined;
  dayKey?: string | null;
};

type UseCoachResult = {
  coach: CoachResponse;
  loading: boolean;
  enabled: boolean;
  source: CoachResponseSource;
  status: CoachResultStatus;
  isStale: boolean;
  error: unknown | null;
  refresh: () => Promise<CoachResponse>;
};

type CoachMutationEvent = {
  uid?: string | null;
};

function resolveDayKey(dayKey?: string | null): string {
  return dayKey?.trim() || getCurrentCoachDayKey();
}

export function useCoach({
  uid,
  dayKey,
}: UseCoachParams): UseCoachResult {
  const resolvedDayKey = resolveDayKey(dayKey);
  const [coach, setCoach] = useState<CoachResponse>(() =>
    createFallbackCoachResponse(resolvedDayKey),
  );
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [source, setSource] = useState<CoachResponseSource>("fallback");
  const [status, setStatus] = useState<CoachResultStatus>("no_user");
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
    coach: CoachResponse;
    enabled: boolean;
    source: CoachResponseSource;
    status: CoachResultStatus;
    isStale: boolean;
    error: unknown | null;
  }) => {
    setCoach(result.coach);
    setEnabled(result.enabled);
    setSource(result.source);
    setStatus(result.status);
    setIsStale(result.isStale);
    setError(result.error);
  }, []);

  useEffect(() => {
    let active = true;

    if (!uid) {
      setCoach(createFallbackCoachResponse(resolvedDayKey));
      setLoading(false);
      setEnabled(true);
      setSource("fallback");
      setStatus("no_user");
      setIsStale(true);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const requestScope = requestScopeKey;

    void getCoach(uid, { dayKey: resolvedDayKey }).then((result) => {
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

    const handleMealMutation = (event?: CoachMutationEvent) => {
      if (!active || event?.uid !== uid) {
        return;
      }

      setLoading(true);
      void (async () => {
        const requestId = ++requestIdRef.current;
        const requestScope = requestScopeKey;
        await invalidateCoachCache(uid, { dayKey: resolvedDayKey });
        const result = await refreshCoach(uid, { dayKey: resolvedDayKey });
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
      on<CoachMutationEvent>("meal:added", handleMealMutation),
      on<CoachMutationEvent>("meal:updated", handleMealMutation),
      on<CoachMutationEvent>("meal:deleted", handleMealMutation),
    ];

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [applyResult, requestScopeKey, resolvedDayKey, uid]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const requestScope = requestScopeKey;
    const result = await refreshCoach(uid, { dayKey: resolvedDayKey });
    if (
      requestIdRef.current === requestId &&
      requestScopeKeyRef.current === requestScope
    ) {
      applyResult(result);
      setLoading(false);
    }
    return result.coach;
  }, [applyResult, requestScopeKey, uid, resolvedDayKey]);

  return {
    coach,
    loading,
    enabled,
    source,
    status,
    isStale,
    error,
    refresh,
  };
}
