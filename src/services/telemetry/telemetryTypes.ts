export type TelemetryPrimitive = string | number | boolean | null;

export type TelemetryPropertyValue =
  | TelemetryPrimitive
  | TelemetryPrimitive[];

export type TelemetryProps = Record<string, TelemetryPropertyValue>;

export const TELEMETRY_EVENT_NAMES = [
  "session_start",
  "onboarding_completed",
  "meal_logged",
  "ai_meal_review_saved",
  "notification_opened",
  "paywall_viewed",
  "purchase_completed",
  "entitlement_activated",
  "domain.purchase.started",
  "domain.purchase.succeeded",
  "domain.entitlement.confirmed",
  "domain.entitlement.confirmation_failed",
  "domain.restore.started",
  "domain.restore.completed",
  "domain.restore.failed",
  "weekly_report_opened",
  "smart_reminder_suppressed",
  "smart_reminder_scheduled",
  "smart_reminder_noop",
  "smart_reminder_decision_failed",
  "smart_reminder_schedule_failed",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];

export type TelemetryEvent = {
  eventId: string;
  name: TelemetryEventName;
  ts: string;
  props?: TelemetryProps;
};

export type TelemetryBatchPayload = {
  sessionId: string;
  app: {
    platform: string;
    appVersion: string;
    build?: string | null;
  };
  device: {
    locale?: string | null;
    tzOffsetMin?: number | null;
  };
  events: TelemetryEvent[];
};
