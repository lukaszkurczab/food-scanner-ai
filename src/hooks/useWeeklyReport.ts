import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const fallbackReport = useMemo(
    () => createFallbackWeeklyReport(resolvedWeekEnd),
    [resolvedWeekEnd],
  );
  const [report, setReport] = useState<WeeklyReport>(() =>
    fallbackReport,
  );
  const [loading, setLoading] = useState<boolean>(!!uid && active);
  const [enabled, setEnabled] = useState<boolean>(active);
  const [source, setSource] = useState<WeeklyReportSource>(
    active ? "fallback" : "disabled",
  );
  const [status, setStatus] = useState<WeeklyReportResultStatus>(
    active ? "no_user" : "disabled",
  );
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
      setReport(fallbackReport);
      setLoading(false);
      setEnabled(false);
      setSource("disabled");
      setStatus("disabled");
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
  }, [active, applyResult, fallbackReport, requestScopeKey, resolvedWeekEnd, uid]);

  const refresh = useCallback(async () => {
    if (!active) {
      applyResult({
        report: fallbackReport,
        enabled: false,
        source: "disabled",
        status: "disabled",
        error: null,
      });
      setLoading(false);
      return fallbackReport;
    }

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
  }, [active, applyResult, fallbackReport, requestScopeKey, resolvedWeekEnd, uid]);

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
