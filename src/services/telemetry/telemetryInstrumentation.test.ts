import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import {
  normalizeTelemetryScreenName,
  toSmartReminderConfidenceBucket,
  toSmartReminderScheduledWindow,
  trackAiChatResult,
  trackAiChatSend,
  trackCoachCardCtaClicked,
  trackCoachCardExpanded,
  trackCoachCardViewed,
  trackCoachEmptyStateViewed,
  trackMealAddMethodSelected,
  trackMealAdded,
  trackMealDeleted,
  trackMealUpdated,
  trackNotificationFired,
  trackNotificationOpened,
  trackNotificationScheduled,
  trackSmartReminderDecisionFailed,
  trackSmartReminderNoop,
  trackSmartReminderScheduled,
  trackSmartReminderScheduleFailed,
  trackSmartReminderSuppressed,
  trackScreenView,
  trackSessionEnd,
  trackSessionStart,
} from "@/services/telemetry/telemetryInstrumentation";

const mockTrack = jest.fn<(name: string, props?: Record<string, unknown>) => Promise<void>>();

jest.mock("@/services/telemetry/telemetryClient", () => ({
  track: (name: string, props?: Record<string, unknown>) => mockTrack(name, props),
}));

const baseMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-18T12:00:00.000Z",
  type: "lunch",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-03-18T12:00:00.000Z",
  updatedAt: "2026-03-18T12:00:00.000Z",
  syncState: "pending",
  source: "manual",
  ...overrides,
});

describe("telemetryInstrumentation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrack.mockResolvedValue();
  });

  it("normalizes route names into stable telemetry screen names", () => {
    expect(normalizeTelemetryScreenName("MealAddMethod")).toBe("meal_add_method");
    expect(normalizeTelemetryScreenName("MealTextAI")).toBe("meal_text_ai");
  });

  it("maps meal add methods and screen views to privacy-safe props", async () => {
    await trackSessionStart();
    await trackSessionEnd();
    await trackScreenView("MealAddMethod");
    await trackMealAddMethodSelected("ai_photo");

    expect(mockTrack).toHaveBeenNthCalledWith(1, "session_start", {
      origin: "app_boot",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, "session_end", {
      origin: "app_background",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(3, "screen_view", {
      screen: "meal_add_method",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(4, "meal_add_method_selected", {
      mealInputMethod: "photo",
    });
  });

  it("maps meal and AI domain events to stable telemetry payloads", async () => {
    await trackMealAdded(
      baseMeal({
        source: "ai",
        photoUrl: "file:///meal.jpg",
        ingredients: [{ id: "i1", name: "Egg", amount: 1, kcal: 80, protein: 6, fat: 5, carbs: 0 }],
      }),
    );
    await trackMealUpdated(baseMeal({ source: "ai", ingredients: [] }));
    await trackMealDeleted(baseMeal({ source: "saved" }));
    await trackAiChatSend("hello world");
    await trackAiChatResult("gateway_reject");

    expect(mockTrack).toHaveBeenNthCalledWith(1, "meal_added", {
      mealInputMethod: "photo",
      ingredientCount: 1,
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, "meal_updated", {
      mealInputMethod: "text",
      ingredientCount: 0,
    });
    expect(mockTrack).toHaveBeenNthCalledWith(3, "meal_deleted", {
      mealInputMethod: "saved",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(4, "ai_chat_send", {
      surface: "chat",
      chars: 11,
    });
    expect(mockTrack).toHaveBeenNthCalledWith(5, "ai_chat_result", {
      surface: "chat",
      success: false,
      resultStatus: "gateway_reject",
    });
  });

  it("maps notification telemetry events to privacy-safe props", async () => {
    await trackNotificationScheduled({
      notificationType: "day_fill",
      origin: "user_notifications",
    });
    await trackNotificationFired({
      notificationType: "meal_reminder",
      origin: "system_notifications",
      foreground: true,
    });
    await trackNotificationOpened({
      notificationType: "stats_weekly_summary",
      origin: "system_notifications",
      openedFromBackground: true,
      actionIdentifier: "DEFAULT",
    });

    expect(mockTrack).toHaveBeenNthCalledWith(1, "notification_scheduled", {
      notificationType: "day_fill",
      origin: "user_notifications",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, "notification_fired", {
      notificationType: "meal_reminder",
      origin: "system_notifications",
      foreground: true,
    });
    expect(mockTrack).toHaveBeenNthCalledWith(3, "notification_opened", {
      notificationType: "stats_weekly_summary",
      origin: "system_notifications",
      openedFromBackground: true,
      actionIdentifier: "default",
    });
  });

  it("maps coach insight telemetry events to the backend allowlist", async () => {
    await trackCoachCardViewed({
      insightType: "under_logging",
      actionType: "log_next_meal",
      isPositive: false,
    });
    await trackCoachCardExpanded({
      insightType: "under_logging",
    });
    await trackCoachCardCtaClicked({
      insightType: "under_logging",
      actionType: "log_next_meal",
      targetScreen: "MealAddMethod",
    });
    await trackCoachEmptyStateViewed({
      emptyReason: "no_data",
    });

    expect(mockTrack).toHaveBeenNthCalledWith(1, "coach_card_viewed", {
      insightType: "under_logging",
      actionType: "log_next_meal",
      isPositive: false,
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, "coach_card_expanded", {
      insightType: "under_logging",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(3, "coach_card_cta_clicked", {
      insightType: "under_logging",
      actionType: "log_next_meal",
      targetScreen: "MealAddMethod",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(4, "coach_empty_state_viewed", {
      emptyReason: "no_data",
    });
  });

  it("maps smart reminder telemetry events to the backend allowlist", async () => {
    expect(toSmartReminderConfidenceBucket(0.2)).toBe("low");
    expect(toSmartReminderConfidenceBucket(0.7)).toBe("medium");
    expect(toSmartReminderConfidenceBucket(0.9)).toBe("high");
    expect(toSmartReminderScheduledWindow(360)).toBe("morning");
    expect(toSmartReminderScheduledWindow(780)).toBe("afternoon");
    expect(toSmartReminderScheduledWindow(1140)).toBe("evening");

    await trackSmartReminderScheduled({
      reminderKind: "log_next_meal",
      decision: "send",
      confidenceBucket: "high",
      scheduledWindow: "evening",
    });
    await trackSmartReminderSuppressed({
      decision: "suppress",
      suppressionReason: "quiet_hours",
      confidenceBucket: "high",
    });
    await trackSmartReminderNoop({
      decision: "noop",
      noopReason: "insufficient_signal",
      confidenceBucket: "medium",
    });
    await trackSmartReminderDecisionFailed({
      failureReason: "invalid_payload",
    });
    await trackSmartReminderScheduleFailed({
      reminderKind: "log_next_meal",
      decision: "send",
      confidenceBucket: "high",
      failureReason: "invalid_time",
    });

    expect(mockTrack).toHaveBeenNthCalledWith(1, "smart_reminder_scheduled", {
      reminderKind: "log_next_meal",
      decision: "send",
      confidenceBucket: "high",
      scheduledWindow: "evening",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, "smart_reminder_suppressed", {
      decision: "suppress",
      suppressionReason: "quiet_hours",
      confidenceBucket: "high",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(3, "smart_reminder_noop", {
      decision: "noop",
      noopReason: "insufficient_signal",
      confidenceBucket: "medium",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(4, "smart_reminder_decision_failed", {
      failureReason: "invalid_payload",
    });
    expect(mockTrack).toHaveBeenNthCalledWith(5, "smart_reminder_schedule_failed", {
      reminderKind: "log_next_meal",
      decision: "send",
      confidenceBucket: "high",
      failureReason: "invalid_time",
    });
  });
});
