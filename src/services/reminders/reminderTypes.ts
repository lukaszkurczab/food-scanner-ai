export const REMINDER_DECISION_TYPES = ["send", "suppress", "noop"] as const;

export const REMINDER_KINDS = [
  "log_first_meal",
  "log_next_meal",
  "complete_day",
] as const;

export const REMINDER_REASON_CODES = [
  "preferred_window_open",
  "preferred_window_today",
  "habit_window_match",
  "habit_window_today",
  "day_empty",
  "day_partially_logged",
  "logging_usually_happens_now",
  "recent_activity_detected",
  "already_logged_recently",
  "quiet_hours",
  "reminders_disabled",
  "insufficient_signal",
  "day_already_complete",
] as const;

export const SEND_REMINDER_REASON_CODES = [
  "preferred_window_open",
  "preferred_window_today",
  "habit_window_match",
  "habit_window_today",
  "day_empty",
  "day_partially_logged",
  "logging_usually_happens_now",
] as const;

export const SUPPRESS_REMINDER_REASON_CODES = [
  "recent_activity_detected",
  "already_logged_recently",
  "quiet_hours",
  "reminders_disabled",
] as const;

export const NOOP_REMINDER_REASON_CODES = [
  "insufficient_signal",
  "day_already_complete",
] as const;

export type ReminderDecisionType = (typeof REMINDER_DECISION_TYPES)[number];
export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type ReminderReasonCode = (typeof REMINDER_REASON_CODES)[number];
export type SendReminderReasonCode = (typeof SEND_REMINDER_REASON_CODES)[number];
export type SuppressReminderReasonCode = (typeof SUPPRESS_REMINDER_REASON_CODES)[number];
export type NoopReminderReasonCode = (typeof NOOP_REMINDER_REASON_CODES)[number];

export type ReminderDecision = {
  dayKey: string;
  computedAt: string;
  decision: ReminderDecisionType;
  kind: ReminderKind | null;
  reasonCodes: ReminderReasonCode[];
  scheduledAtUtc: string | null;
  confidence: number;
  validUntil: string;
};

export type ReminderDecisionSource = "disabled" | "remote" | "fallback";

export type ReminderDecisionResultStatus =
  | "live_success"
  | "invalid_payload"
  | "disabled"
  | "service_unavailable"
  | "no_user";

export type ReminderDecisionResult = {
  decision: ReminderDecision | null;
  source: ReminderDecisionSource;
  status: ReminderDecisionResultStatus;
  enabled: boolean;
  error: unknown | null;
};
