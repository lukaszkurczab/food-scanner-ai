import type {
  CoachActionType,
  CoachEmptyReason,
  CoachInsightType,
  CoachSource,
} from "@/services/coach/coachTypes";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const COACH_INSIGHT_TYPES: CoachInsightType[] = [
  "under_logging",
  "high_unknown_meal_details",
  "low_protein_consistency",
  "calorie_under_target",
  "positive_momentum",
  "stable",
];

export const COACH_ACTION_TYPES: CoachActionType[] = [
  "log_next_meal",
  "open_chat",
  "review_history",
  "none",
];

export const COACH_SOURCES: CoachSource[] = ["rules"];

export const COACH_EMPTY_REASONS: CoachEmptyReason[] = [
  "no_data",
  "insufficient_data",
];

export function isCoachInsightType(value: unknown): value is CoachInsightType {
  return typeof value === "string" && COACH_INSIGHT_TYPES.includes(value as CoachInsightType);
}

export function isCoachActionType(value: unknown): value is CoachActionType {
  return typeof value === "string" && COACH_ACTION_TYPES.includes(value as CoachActionType);
}

export function isCoachSource(value: unknown): value is CoachSource {
  return value === "rules";
}

export function isCoachEmptyReason(value: unknown): value is CoachEmptyReason {
  return typeof value === "string" && COACH_EMPTY_REASONS.includes(value as CoachEmptyReason);
}

export function isCoachDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_KEY_RE.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getCoachInsightId(
  dayKey: string,
  insightType: CoachInsightType,
): string {
  return `${dayKey}:${insightType}`;
}

export function getCoachInsightValidUntil(dayKey: string): string {
  return `${dayKey}T23:59:59Z`;
}

export function isCanonicalCoachInsightId(
  value: unknown,
  dayKey: string,
  insightType: CoachInsightType,
): value is string {
  return value === getCoachInsightId(dayKey, insightType);
}

export function isCanonicalCoachValidUntil(
  value: unknown,
  dayKey: string,
): value is string {
  return value === getCoachInsightValidUntil(dayKey);
}
