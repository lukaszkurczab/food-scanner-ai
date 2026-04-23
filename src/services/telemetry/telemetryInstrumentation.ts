import type {
  NoopReminderReasonCode,
  ReminderDecisionType,
  ReminderKind,
  SuppressReminderReasonCode,
} from "@/services/reminders/reminderTypes";
import type { TelemetryProps } from "@/services/telemetry/telemetryTypes";
import { track } from "@/services/telemetry/telemetryClient";
import type { Meal } from "@/types/meal";

type MealInputMethod = "manual" | "photo" | "barcode" | "text" | "saved" | "quick_add";
type NotificationTelemetryOrigin =
  | "user_notifications"
  | "system_notifications"
  | "unknown";

type NotificationTelemetryInput = {
  notificationType?: string | null;
  origin?: string | null;
};

type SmartReminderConfidenceBucket = "low" | "medium" | "high";
type SmartReminderScheduledWindow =
  | "overnight"
  | "morning"
  | "afternoon"
  | "evening"
  | "late_evening";
type SmartReminderDecisionFailureReason =
  | "invalid_payload"
  | "service_unavailable";
type SmartReminderScheduleFailureReason =
  | "permission_unavailable"
  | "invalid_time"
  | "schedule_error";

type SmartReminderTelemetryInput = {
  reminderKind?: ReminderKind | null;
  decision?: ReminderDecisionType | null;
  suppressionReason?: SuppressReminderReasonCode | null;
  noopReason?: NoopReminderReasonCode | null;
  confidenceBucket?: SmartReminderConfidenceBucket | null;
  scheduledWindow?: SmartReminderScheduledWindow | null;
  failureReason?:
    | SmartReminderDecisionFailureReason
    | SmartReminderScheduleFailureReason
    | null;
};

type OnboardingModeTelemetry = "first" | "refill";

type PaywallSource = "manage_subscription" | "meal_text_limit";
type EntitlementSource = "purchase" | "restore";

type WeeklyReportStatus = "ready" | "insufficient_data" | "unavailable";

type AiMealReviewInputMethod = "photo" | "text";

function normalizeNotificationValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || null;
}

function normalizeNotificationOrigin(
  origin: string | null | undefined,
): NotificationTelemetryOrigin {
  switch (normalizeNotificationValue(origin)) {
    case "user_notifications":
      return "user_notifications";
    case "system_notifications":
      return "system_notifications";
    default:
      return "unknown";
  }
}

function buildNotificationProps(
  input: NotificationTelemetryInput,
): TelemetryProps {
  return {
    notificationType:
      normalizeNotificationValue(input.notificationType) || "unknown",
    origin: normalizeNotificationOrigin(input.origin),
  };
}

function buildSmartReminderProps(
  input: SmartReminderTelemetryInput,
): TelemetryProps {
  const props: TelemetryProps = {};
  for (const [key, value] of Object.entries(input)) {
    if (value != null) {
      props[key] = value;
    }
  }
  return props;
}

function inferMealInputMethod(meal: Pick<
  Meal,
  "inputMethod" | "source" | "photoUrl" | "photoLocalPath" | "localPhotoUrl" | "imageId"
>): MealInputMethod | null {
  if (meal.inputMethod) {
    return meal.inputMethod;
  }

  if (meal.source === "saved") {
    return "saved";
  }

  if (meal.source === "manual" || meal.source === null) {
    return "manual";
  }

  if (meal.source === "ai") {
    if (meal.photoUrl || meal.photoLocalPath || meal.localPhotoUrl || meal.imageId) {
      return "photo";
    }
    return "text";
  }

  return null;
}

function resolveWeeklyReportStatus(input: WeeklyReportStatus): WeeklyReportStatus {
  return input;
}

export function toSmartReminderConfidenceBucket(
  confidence: number,
): SmartReminderConfidenceBucket {
  if (confidence >= 0.8) {
    return "high";
  }

  if (confidence >= 0.5) {
    return "medium";
  }

  return "low";
}

export function toSmartReminderScheduledWindow(
  localMinuteOfDay: number,
): SmartReminderScheduledWindow {
  if (localMinuteOfDay < 360) {
    return "overnight";
  }

  if (localMinuteOfDay < 720) {
    return "morning";
  }

  if (localMinuteOfDay < 1020) {
    return "afternoon";
  }

  if (localMinuteOfDay < 1260) {
    return "evening";
  }

  return "late_evening";
}

export function trackSessionStart(): Promise<void> {
  return track("session_start", { origin: "app_boot" });
}

export function trackMealLogged(meal: Meal): Promise<void> {
  const mealInputMethod = inferMealInputMethod(meal);
  return track("meal_logged", {
    ingredientCount: meal.ingredients.length,
    source: meal.source ?? "manual",
    ...(mealInputMethod ? { mealInputMethod } : {}),
  });
}

export function trackAiMealReviewSaved(input: {
  inputMethod: AiMealReviewInputMethod;
  corrected: boolean;
  ingredientCount: number;
  requestId?: string | null;
}): Promise<void> {
  return track("ai_meal_review_saved", {
    inputMethod: input.inputMethod,
    corrected: input.corrected,
    ingredientCount: input.ingredientCount,
    ...(input.requestId ? { requestId: input.requestId } : {}),
  });
}

export function trackNotificationOpened(
  input: NotificationTelemetryInput,
): Promise<void> {
  return track("notification_opened", buildNotificationProps(input));
}

export function trackPaywallViewed(input: {
  source: PaywallSource;
}): Promise<void> {
  return track("paywall_viewed", {
    source: input.source,
  });
}

export function trackPurchaseCompleted(input: {
  source: "manage_subscription";
}): Promise<void> {
  return track("purchase_completed", {
    source: input.source,
  });
}

export function trackEntitlementActivated(input: {
  source: EntitlementSource;
}): Promise<void> {
  return track("entitlement_activated", {
    source: input.source,
    tier: "premium",
  });
}

export function trackWeeklyReportOpened(input: {
  reportStatus: WeeklyReportStatus;
  insightCount: number;
  priorityCount: number;
}): Promise<void> {
  return track("weekly_report_opened", {
    reportStatus: resolveWeeklyReportStatus(input.reportStatus),
    insightCount: input.insightCount,
    priorityCount: input.priorityCount,
  });
}

export function trackOnboardingCompleted(input: {
  mode: OnboardingModeTelemetry;
}): Promise<void> {
  return track("onboarding_completed", {
    mode: input.mode,
  });
}

export function trackSmartReminderScheduled(
  input: Required<Pick<SmartReminderTelemetryInput, "reminderKind" | "decision" | "confidenceBucket" | "scheduledWindow">>,
): Promise<void> {
  return track("smart_reminder_scheduled", buildSmartReminderProps(input));
}

export function trackSmartReminderSuppressed(
  input: Required<Pick<SmartReminderTelemetryInput, "decision" | "suppressionReason" | "confidenceBucket">>,
): Promise<void> {
  return track("smart_reminder_suppressed", buildSmartReminderProps(input));
}

export function trackSmartReminderNoop(
  input: Required<Pick<SmartReminderTelemetryInput, "decision" | "noopReason" | "confidenceBucket">>,
): Promise<void> {
  return track("smart_reminder_noop", buildSmartReminderProps(input));
}

export function trackSmartReminderDecisionFailed(
  input: Required<Pick<SmartReminderTelemetryInput, "failureReason">>,
): Promise<void> {
  return track("smart_reminder_decision_failed", buildSmartReminderProps(input));
}

export function trackSmartReminderScheduleFailed(
  input: Required<Pick<SmartReminderTelemetryInput, "reminderKind" | "decision" | "confidenceBucket" | "failureReason">>,
): Promise<void> {
  return track("smart_reminder_schedule_failed", buildSmartReminderProps(input));
}
