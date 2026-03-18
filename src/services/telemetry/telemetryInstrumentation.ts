import type { Meal } from "@/types/meal";
import type { TelemetryProps } from "@/services/telemetry/telemetryTypes";
import { track } from "@/services/telemetry/telemetryClient";

type MealInputMethod = "manual" | "photo" | "barcode" | "text" | "saved" | "quick_add";
type NotificationTelemetrySource =
  | "user_notifications"
  | "system_notifications"
  | "unknown";

type NotificationTelemetryInput = {
  notificationType?: string | null;
  source?: string | null;
  actionIdentifier?: string | null;
  openedFromBackground?: boolean;
  foreground?: boolean;
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

function normalizeNotificationSource(
  source: string | null | undefined,
): NotificationTelemetrySource {
  switch (normalizeNotificationValue(source)) {
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
    source: normalizeNotificationSource(input.source),
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
  return track("session_start", { source: "app_boot" });
}

export function trackSessionEnd(): Promise<void> {
  return track("session_end", { source: "app_background" });
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
    source: "chat",
    chars: message.trim().length,
  });
}

export function trackAiChatResult(resultStatus: string): Promise<void> {
  return track("ai_chat_result", {
    source: "chat",
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
