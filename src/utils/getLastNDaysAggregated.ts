import type { Meal, Nutrients } from "@/src/types";
import { calculateTotalNutrients } from "@/src/utils/calculateTotalNutrients";

type AggregationType = "kcal" | "nutrients";

export function getLastNDaysAggregated(
  meals: Meal[],
  days?: number,
  aggregation?: "kcal"
): { labels: string[]; data: number[] };
export function getLastNDaysAggregated(
  meals: Meal[],
  days: number,
  aggregation: "nutrients"
): { labels: string[]; data: Nutrients[] };
export function getLastNDaysAggregated(
  meals: Meal[],
  days: number = 7,
  aggregation: "kcal" | "nutrients" = "kcal"
) {
  const now = new Date();

  const periods = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (days - 1 - i));
    return d;
  });

  const labels = periods.map((d) =>
    days <= 7
      ? d.toLocaleDateString(undefined, { weekday: "short" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  );

  const data = periods.map((day) => {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    const mealsForDay = meals.filter((m) => {
      const ts =
        typeof m.timestamp === "string" ? Date.parse(m.timestamp) : m.timestamp;
      return ts >= start.getTime() && ts <= end.getTime();
    });

    if (aggregation === "nutrients") {
      return calculateTotalNutrients(mealsForDay);
    }

    return mealsForDay.reduce(
      (sum, meal) =>
        sum + meal.ingredients.reduce((acc, ing) => acc + ing.kcal, 0),
      0
    );
  });

  return { labels, data };
}
