import type { Meal } from "@/types/meal";
import type { CoachActionType, CoachEmptyReason, CoachInsightType } from "@/services/coach/coachTypes";
import type {
  NoopReminderReasonCode,
  ReminderDecisionType,
  ReminderKind,
  SuppressReminderReasonCode,
} from "@/services/reminders/reminderTypes";
import type { TelemetryProps } from "@/services/telemetry/telemetryTypes";
import { track } from "@/services/telemetry/telemetryClient";

type MealInputMethod = "manual" | "photo" | "barcode" | "text" | "saved" | "quick_add";
type NotificationTelemetryOrigin =
  | "user_notifications"
  | "system_notifications"
  | "unknown";

type NotificationTelemetryInput = {
  notificationType?: string | null;
  origin?: string | null;
  actionIdentifier?: string | null;
  openedFromBackground?: boolean;
  foreground?: boolean;
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

export function normalizeTelemetryScreenName(routeName: string): string {
  const normalized = routeName
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || "unknown";
}

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
  const props: TelemetryProps = {
    notificationType:
      normalizeNotificationValue(input.notificationType) || "unknown",
    origin: normalizeNotificationOrigin(input.origin),
  };

  const actionIdentifier = normalizeNotificationValue(input.actionIdentifier);
  if (actionIdentifier) {
    props.actionIdentifier = actionIdentifier;
  }

  if (typeof input.openedFromBackground === "boolean") {
    props.openedFromBackground = input.openedFromBackground;
  }

  if (typeof input.foreground === "boolean") {
    props.foreground = input.foreground;
  }

  return props;
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

export function mapMealAddMethodKeyToInputMethod(
  key: string,
): MealInputMethod | null {
  switch (key) {
    case "ai_photo":
      return "photo";
    case "ai_text":
      return "text";
    case "manual":
      return "manual";
    case "saved":
      return "saved";
    default:
      return null;
  }
}

export function inferMealInputMethod(meal: Pick<
  Meal,
  "source" | "photoUrl" | "photoLocalPath" | "localPhotoUrl" | "imageId"
>): MealInputMethod | null {
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

function buildMealProps(meal: Meal): TelemetryProps {
  const mealInputMethod = inferMealInputMethod(meal);
  const props: TelemetryProps = {
    ingredientCount: meal.ingredients.length,
  };

  if (mealInputMethod) {
    props.mealInputMethod = mealInputMethod;
  }

  return props;
}

export function trackSessionStart(): Promise<void> {
  return track("session_start", { origin: "app_boot" });
}

export function trackSessionEnd(): Promise<void> {
  return track("session_end", { origin: "app_background" });
}

export function trackScreenView(routeName: string): Promise<void> {
  return track("screen_view", {
    screen: normalizeTelemetryScreenName(routeName),
  });
}

export function trackMealAddMethodSelected(optionKey: string): Promise<void> {
  const mealInputMethod = mapMealAddMethodKeyToInputMethod(optionKey);
  return track("meal_add_method_selected", {
    ...(mealInputMethod ? { mealInputMethod } : {}),
  });
}

export function trackMealAdded(meal: Meal): Promise<void> {
  return track("meal_added", buildMealProps(meal));
}

export function trackMealUpdated(meal: Meal): Promise<void> {
  return track("meal_updated", buildMealProps(meal));
}

export function trackMealDeleted(meal?: Meal | null): Promise<void> {
  const mealInputMethod = meal ? inferMealInputMethod(meal) : null;
  return track("meal_deleted", {
    ...(mealInputMethod ? { mealInputMethod } : {}),
  });
}

export function trackAiChatSend(message: string): Promise<void> {
  return track("ai_chat_send", {
    surface: "chat",
    chars: message.trim().length,
  });
}

export function trackAiChatResult(resultStatus: string): Promise<void> {
  return track("ai_chat_result", {
    surface: "chat",
    success: resultStatus === "success",
    resultStatus,
  });
}

export function trackNotificationScheduled(
  input: NotificationTelemetryInput,
): Promise<void> {
  return track("notification_scheduled", buildNotificationProps(input));
}

export function trackNotificationFired(
  input: NotificationTelemetryInput,
): Promise<void> {
  return track("notification_fired", buildNotificationProps(input));
}

export function trackNotificationOpened(
  input: NotificationTelemetryInput,
): Promise<void> {
  return track("notification_opened", buildNotificationProps(input));
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

export function trackCoachCardViewed(input: {
  insightType: CoachInsightType;
  actionType: CoachActionType;
  isPositive: boolean;
}): Promise<void> {
  return track("coach_card_viewed", {
    insightType: input.insightType,
    actionType: input.actionType,
    isPositive: input.isPositive,
  });
}

export function trackCoachCardExpanded(input: {
  insightType: CoachInsightType;
}): Promise<void> {
  return track("coach_card_expanded", {
    insightType: input.insightType,
  });
}

export function trackCoachCardCtaClicked(input: {
  insightType: CoachInsightType;
  actionType: CoachActionType;
  targetScreen: "MealAddMethod" | "Chat" | "HistoryList";
}): Promise<void> {
  return track("coach_card_cta_clicked", {
    insightType: input.insightType,
    actionType: input.actionType,
    targetScreen: input.targetScreen,
  });
}

export function trackCoachEmptyStateViewed(input: {
  emptyReason: CoachEmptyReason;
}): Promise<void> {
  return track("coach_empty_state_viewed", {
    emptyReason: input.emptyReason,
  });
}
