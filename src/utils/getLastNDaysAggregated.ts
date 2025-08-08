import type { Meal, Nutrients } from "@/src/types";
import { calculateTotalNutrients } from "@/src/utils/calculateTotalNutrients";

type AggregationType = "kcal" | "nutrients";

function parseMealTime(meal: Meal): number | null {
  const raw =
    meal.timestamp && meal.timestamp.trim() ? meal.timestamp : meal.createdAt;
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

function getDayRangeLocal(d: Date) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.getTime(), end: end.getTime() };
}

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
  aggregation: AggregationType = "kcal"
): { labels: string[]; data: number[] | Nutrients[] } {
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
    const { start, end } = getDayRangeLocal(day);

    const mealsForDay = meals.filter((m) => {
      const ts = parseMealTime(m);
      return ts !== null && ts >= start && ts < end;
    });

    if (aggregation === "nutrients") {
      return calculateTotalNutrients(mealsForDay);
    }

    const dayKcal = mealsForDay.reduce((sum, meal) => {
      const ingredients = Array.isArray(meal.ingredients)
        ? meal.ingredients
        : (() => {
            try {
              return JSON.parse((meal as any).ingredients ?? "[]");
            } catch {
              return [];
            }
          })();
      const kcal = ingredients.reduce(
        (acc: number, ing: any) => acc + (Number(ing?.kcal) || 0),
        0
      );
      return sum + kcal;
    }, 0);

    return dayKcal;
  });

  return { labels, data } as any;
}
