import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFallbackWeeklyReport,
  getCurrentWeeklyReportWeekEnd,
  getWeeklyReport,
} from "@/services/weeklyReport/weeklyReportService";
import type {
  WeeklyReport,
  WeeklyReportResultStatus,
  WeeklyReportSource,
} from "@/services/weeklyReport/weeklyReportTypes";

type UseWeeklyReportParams = {
  uid: string | null | undefined;
  weekEnd?: string | null;
  active?: boolean;
};

type UseWeeklyReportResult = {
  report: WeeklyReport;
  loading: boolean;
  enabled: boolean;
  source: WeeklyReportSource;
  status: WeeklyReportResultStatus;
  error: unknown | null;
  refresh: () => Promise<WeeklyReport>;
};

function resolveWeekEnd(weekEnd?: string | null): string {
  return weekEnd?.trim() || getCurrentWeeklyReportWeekEnd();
}

export function useWeeklyReport({
  uid,
  weekEnd,
  active = true,
}: UseWeeklyReportParams): UseWeeklyReportResult {
  const resolvedWeekEnd = resolveWeekEnd(weekEnd);
  const [report, setReport] = useState<WeeklyReport>(() =>
    createFallbackWeeklyReport(resolvedWeekEnd),
  );
  const [loading, setLoading] = useState<boolean>(!!uid && active);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [source, setSource] = useState<WeeklyReportSource>("fallback");
  const [status, setStatus] = useState<WeeklyReportResultStatus>("no_user");
  const [error, setError] = useState<unknown | null>(null);
  const requestIdRef = useRef(0);
  const requestScopeKey = `${uid ?? ""}:${resolvedWeekEnd}:${active ? "active" : "inactive"}`;
  const requestScopeKeyRef = useRef(requestScopeKey);

  useEffect(() => {
    requestScopeKeyRef.current = requestScopeKey;
    requestIdRef.current += 1;
  }, [requestScopeKey]);

  const applyResult = useCallback((result: {
    report: WeeklyReport;
    enabled: boolean;
    source: WeeklyReportSource;
    status: WeeklyReportResultStatus;
    error: unknown | null;
  }) => {
    setReport(result.report);
    setEnabled(result.enabled);
    setSource(result.source);
    setStatus(result.status);
    setError(result.error);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!active) {
      setReport(createFallbackWeeklyReport(resolvedWeekEnd));
      setLoading(false);
      setEnabled(true);
      setSource("fallback");
      setStatus("no_user");
      setError(null);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    const requestId = ++requestIdRef.current;
    const requestScope = requestScopeKey;
    void getWeeklyReport(uid, { weekEnd: resolvedWeekEnd }).then((result) => {
      if (
        !mounted ||
        requestIdRef.current !== requestId ||
        requestScopeKeyRef.current !== requestScope
      ) {
        return;
      }
      applyResult(result);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [active, applyResult, resolvedWeekEnd, uid]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const requestScope = requestScopeKey;
    const result = await getWeeklyReport(uid, { weekEnd: resolvedWeekEnd });
    if (
      requestIdRef.current === requestId &&
      requestScopeKeyRef.current === requestScope
    ) {
      applyResult(result);
      setLoading(false);
    }
    return result.report;
  }, [applyResult, requestScopeKey, resolvedWeekEnd, uid]);

  return {
    report,
    loading,
    enabled,
    source,
    status,
    error,
    refresh,
  };
}
