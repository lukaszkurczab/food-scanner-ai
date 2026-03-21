import type {
  WeeklyReportInsightImportance,
  WeeklyReportInsightTone,
  WeeklyReportInsightType,
  WeeklyReportPriorityType,
  WeeklyReportStatus,
} from "@/services/weeklyReport/weeklyReportTypes";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKLY_REPORT_STATUSES: WeeklyReportStatus[] = [
  "ready",
  "insufficient_data",
  "not_available",
];

export const WEEKLY_REPORT_INSIGHT_TYPES: WeeklyReportInsightType[] = [
  "consistency",
  "logging_coverage",
  "start_of_day_pattern",
  "day_completion_pattern",
  "weekend_drift",
  "improving_trend",
];

export const WEEKLY_REPORT_INSIGHT_IMPORTANCE: WeeklyReportInsightImportance[] =
  ["high", "medium", "low"];

export const WEEKLY_REPORT_INSIGHT_TONES: WeeklyReportInsightTone[] = [
  "positive",
  "neutral",
  "negative",
];

export const WEEKLY_REPORT_PRIORITY_TYPES: WeeklyReportPriorityType[] = [
  "maintain_consistency",
  "increase_logging_coverage",
  "stabilize_start_of_day",
  "improve_day_completion",
  "reduce_weekend_drift",
];

export function isWeeklyReportStatus(value: unknown): value is WeeklyReportStatus {
  return typeof value === "string" && WEEKLY_REPORT_STATUSES.includes(value as WeeklyReportStatus);
}

export function isWeeklyReportInsightType(
  value: unknown,
): value is WeeklyReportInsightType {
  return (
    typeof value === "string" &&
    WEEKLY_REPORT_INSIGHT_TYPES.includes(value as WeeklyReportInsightType)
  );
}

export function isWeeklyReportInsightImportance(
  value: unknown,
): value is WeeklyReportInsightImportance {
  return (
    typeof value === "string" &&
    WEEKLY_REPORT_INSIGHT_IMPORTANCE.includes(value as WeeklyReportInsightImportance)
  );
}

export function isWeeklyReportInsightTone(
  value: unknown,
): value is WeeklyReportInsightTone {
  return (
    typeof value === "string" &&
    WEEKLY_REPORT_INSIGHT_TONES.includes(value as WeeklyReportInsightTone)
  );
}

export function isWeeklyReportPriorityType(
  value: unknown,
): value is WeeklyReportPriorityType {
  return (
    typeof value === "string" &&
    WEEKLY_REPORT_PRIORITY_TYPES.includes(value as WeeklyReportPriorityType)
  );
}

export function isWeeklyReportDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_KEY_RE.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
