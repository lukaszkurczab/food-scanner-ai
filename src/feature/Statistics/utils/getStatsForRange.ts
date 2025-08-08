import type { Meal } from "@/src/types";
import { calculateTotalNutrients } from "@/src/utils/calculateTotalNutrients";
import { getLastNDaysAggregated } from "@/src/utils/getLastNDaysAggregated";

export type StatsRange = { start: Date; end: Date }; // [start, end)
export type StatsResult = {
  labels: string[];
  caloriesSeries: number[];
  totals: { kcal: number; protein: number; fat: number; carbs: number };
  averages: { kcal: number; protein: number; fat: number; carbs: number };
  goal?: number | null;
  progressPct?: number | null;
};

export function getStatsForRange(
  meals: Meal[],
  range: StatsRange,
  userGoal?: number | null
): StatsResult {
  const days = Math.max(
    1,
    Math.round((+range.end - +range.start) / (24 * 60 * 60 * 1000))
  );
  const { labels, data } = getLastNDaysAggregated(meals, days, "kcal");
  const caloriesSeries = data as number[];

  const mealsInRange = meals.filter((m) => {
    const raw = m.timestamp && m.timestamp.trim() ? m.timestamp : m.createdAt;
    const t = typeof raw === "number" ? raw : Date.parse(raw);
    return !Number.isNaN(t) && t >= +range.start && t < +range.end;
  });
  const totals = calculateTotalNutrients(mealsInRange);
  const averages = {
    kcal: Math.round((totals.kcal || 0) / days),
    protein: Math.round((totals.protein || 0) / days),
    fat: Math.round((totals.fat || 0) / days),
    carbs: Math.round((totals.carbs || 0) / days),
  };

  const goal = userGoal ?? null;
  const progressPct =
    goal && goal > 0
      ? Math.round(
          (caloriesSeries.reduce((s, v) => s + v, 0) / (goal * days)) * 100
        )
      : null;

  return { labels, caloriesSeries, totals, averages, goal, progressPct };
}
