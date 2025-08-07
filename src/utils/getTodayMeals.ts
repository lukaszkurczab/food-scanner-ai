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
    const ts =
      typeof meal.timestamp === "string"
        ? Date.parse(meal.timestamp)
        : meal.timestamp;
    return ts >= start && ts < end;
  });
}
