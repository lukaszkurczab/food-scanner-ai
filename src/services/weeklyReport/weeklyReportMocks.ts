import type {
  WeeklyReport,
  WeeklyReportResult,
  WeeklyReportStatus,
} from "@/services/weeklyReport/weeklyReportTypes";

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPeriod(weekEnd?: string | null) {
  const endDate = weekEnd ? new Date(`${weekEnd}T12:00:00`) : new Date("2026-03-23T12:00:00");
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  return {
    startDay: toDayKey(startDate),
    endDay: toDayKey(endDate),
  };
}

export function createMockWeeklyReport(
  status: WeeklyReportStatus = "ready",
  weekEnd?: string | null,
): WeeklyReport {
  const period = buildPeriod(weekEnd);

  if (status === "insufficient_data") {
    return {
      status,
      period,
      summary: null,
      insights: [],
      priorities: [],
    };
  }

  if (status === "not_available") {
    return {
      status,
      period,
      summary: null,
      insights: [],
      priorities: [],
    };
  }

  return {
    status: "ready",
    period,
    summary: "Weekday rhythm carried most of the week.",
    insights: [
      {
        type: "consistency",
        importance: "high",
        tone: "positive",
        title: "Weekday meals stayed steadier",
        body: "Lunch and dinner held steadier Monday to Friday.",
        reasonCodes: ["weekday_rhythm_held"],
      },
      {
        type: "weekend_drift",
        importance: "medium",
        tone: "negative",
        title: "Weekend timing drifted later",
        body: "Weekend starts drifted later and loosened the day.",
        reasonCodes: ["weekend_timing_drift"],
      },
    ],
    priorities: [
      {
        type: "reduce_weekend_drift",
        text: "Move the first weekend meal earlier.",
        reasonCodes: ["protect_first_weekend_meal"],
      },
      {
        type: "maintain_consistency",
        text: "Keep weekdays as they are.",
        reasonCodes: ["maintain_weekday_rhythm"],
      },
    ],
  };
}

export function createMockWeeklyReportResult(
  reportStatus: WeeklyReportStatus = "ready",
  weekEnd?: string | null,
): WeeklyReportResult {
  const report = createMockWeeklyReport(reportStatus, weekEnd);
  const status =
    reportStatus === "ready"
      ? "live_success"
      : reportStatus === "insufficient_data"
        ? "live_success"
        : "service_unavailable";

  return {
    report,
    source: "fallback",
    status,
    enabled: true,
    error: null,
  };
}
