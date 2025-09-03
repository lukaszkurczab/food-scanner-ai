import type { NotificationType, AIStyle } from "@/types/notification";

export function getNotificationText(
  type: NotificationType,
  aiStyle: AIStyle,
  data?: { missingKcal?: number }
): { title: string; body: string } {
  const style = aiStyle === "none" ? "friendly" : aiStyle;
  if (type === "meal_reminder") {
    if (style === "concise")
      return { title: "Meal", body: "No breakfast logged." };
    if (style === "detailed")
      return {
        title: "Meal reminder",
        body: "You usually eat breakfast now. Add it to keep your log accurate.",
      };
    return { title: "Time to eat", body: "You haven't added breakfast yet 🍳" };
  }
  if (type === "calorie_goal") {
    const kcal = data?.missingKcal ?? 0;
    if (style === "concise")
      return { title: "Goal not reached", body: `~${kcal} kcal left.` };
    if (style === "detailed")
      return {
        title: "Today's calorie goal",
        body: `You are about ${kcal} kcal below your goal. Consider a light meal.`,
      };
    return {
      title: "Calorie goal",
      body: `You're about ${kcal} kcal short today 🎯`,
    };
  }
  if (style === "concise")
    return { title: "Empty day", body: "No meals today." };
  if (style === "detailed")
    return {
      title: "Fill your diary",
      body: "It looks like today is empty. Add meals to keep your history complete.",
    };
  return { title: "Fill the day", body: "No meals were saved today 📒" };
}
