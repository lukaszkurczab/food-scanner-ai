import type { Meal } from "@/src/types";

export function getTodayMeals(meals: Meal[]): Meal[] {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const end = start + 24 * 60 * 60 * 1000;

  return meals.filter((meal) => {
    const rawTs = meal.timestamp || meal.createdAt;
    if (!rawTs) return false;

    const ts = typeof rawTs === "string" ? Date.parse(rawTs) : rawTs;
    if (isNaN(ts)) return false;

    return ts >= start && ts < end;
  });
}
