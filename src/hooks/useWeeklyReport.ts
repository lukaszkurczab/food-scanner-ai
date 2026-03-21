import { useCallback, useEffect, useState } from "react";
import {
  createFallbackWeeklyReport,
  getCurrentWeeklyReportWeekEnd,
  getWeeklyReport,
  isWeeklyReportsEnabled,
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
  const featureEnabled = isWeeklyReportsEnabled();
  const [report, setReport] = useState<WeeklyReport>(() =>
    createFallbackWeeklyReport(resolvedWeekEnd),
  );
  const [loading, setLoading] = useState<boolean>(!!uid && active && featureEnabled);
  const [enabled, setEnabled] = useState<boolean>(featureEnabled);
  const [source, setSource] = useState<WeeklyReportSource>(
    featureEnabled ? "fallback" : "disabled",
  );
  const [status, setStatus] = useState<WeeklyReportResultStatus>(
    featureEnabled ? "no_user" : "disabled",
  );
  const [error, setError] = useState<unknown | null>(null);

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
      setEnabled(featureEnabled);
      setSource(featureEnabled ? "fallback" : "disabled");
      setStatus(featureEnabled ? "no_user" : "disabled");
      setError(null);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    void getWeeklyReport(uid, { weekEnd: resolvedWeekEnd }).then((result) => {
      if (!mounted) {
        return;
      }
      applyResult(result);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [active, applyResult, featureEnabled, resolvedWeekEnd, uid]);

  const refresh = useCallback(async () => {
    const result = await getWeeklyReport(uid, { weekEnd: resolvedWeekEnd });
    applyResult(result);
    setLoading(false);
    return result.report;
  }, [applyResult, resolvedWeekEnd, uid]);

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
