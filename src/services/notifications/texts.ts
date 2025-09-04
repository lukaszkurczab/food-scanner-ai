import type { NotificationType, AIStyle } from "@/types/notification";
import i18n from "@/i18n";

export function getNotificationText(
  type: NotificationType | "day_fill",
  aiStyle: AIStyle,
  data?: { missingKcal?: number; mealKindLabel?: string },
  locale?: string
): { title: string; body: string } {
  const t = i18n.getFixedT(locale ?? i18n.language, "notifications");

  const style = aiStyle === "none" ? "friendly" : aiStyle;

  if (type === "meal_reminder") {
    if (style === "concise")
      return {
        title: t("push.meal_reminder.title_concise"),
        body: t("push.meal_reminder.body_concise", {
          meal: data?.mealKindLabel ?? t("meals.any"),
        }),
      };
    if (style === "detailed")
      return {
        title: t("push.meal_reminder.title"),
        body: t("push.meal_reminder.body_detailed", {
          meal: data?.mealKindLabel ?? t("meals.any"),
        }),
      };
    return {
      title: t("push.meal_reminder.title"),
      body: t("push.meal_reminder.body", {
        meal: data?.mealKindLabel ?? t("meals.any"),
      }),
    };
  }

  if (type === "calorie_goal") {
    const kcal = data?.missingKcal ?? 0;
    if (style === "concise")
      return {
        title: t("push.calorie_goal.title_concise"),
        body: t("push.calorie_goal.body_concise", { kcal }),
      };
    if (style === "detailed")
      return {
        title: t("push.calorie_goal.title"),
        body: t("push.calorie_goal.body_detailed", { kcal }),
      };
    return {
      title: t("push.calorie_goal.title"),
      body: t("push.calorie_goal.body", { kcal }),
    };
  }

  if (style === "concise")
    return {
      title: t("push.day_fill.title_concise"),
      body: t("push.day_fill.body_concise"),
    };
  if (style === "detailed")
    return {
      title: t("push.day_fill.title"),
      body: t("push.day_fill.body_detailed"),
    };
  return { title: t("push.day_fill.title"), body: t("push.day_fill.body") };
}
