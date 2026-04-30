import type {
  WeeklyReport,
  WeeklyReportInsight,
} from "@/services/weeklyReport/weeklyReportTypes";
import type { useTheme } from "@/theme/useTheme";

function lowerFirst(value: string): string {
  if (!value) return value;
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export function formatWeeklyPeriod(
  period: WeeklyReport["period"],
  locale?: string,
): string {
  const start = new Date(`${period.startDay}T12:00:00`);
  const end = new Date(`${period.endDay}T12:00:00`);
  const sameMonth =
    start.getFullYear() === end.getFullYear()
    && start.getMonth() === end.getMonth();

  if (sameMonth) {
    const monthLabel = new Intl.DateTimeFormat(locale, {
      month: "long",
    }).format(start);
    return `${monthLabel} ${start.getDate()} - ${end.getDate()}`;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function getCarryForwardLine(report: WeeklyReport): string {
  const firstPriority = report.priorities[0]?.text?.trim();
  if (!firstPriority) {
    return "Carry one useful thought forward into next week.";
  }

  return `Carry one thought forward: ${lowerFirst(firstPriority)}`;
}

export function getSignalDotColor(
  insight: WeeklyReportInsight,
  theme: ReturnType<typeof useTheme>,
): string {
  if (insight.tone === "positive") return theme.primary;
  if (insight.tone === "negative") return theme.accentWarm;
  return theme.textSecondary;
}
