import type { Meal } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";

export type StatsRange = { start: Date; end: Date };
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

  const startMs = new Date(range.start).setHours(0, 0, 0, 0);
  const endMs = new Date(range.end).setHours(23, 59, 59, 999);

  const toMillis = (raw: unknown): number => {
    if (typeof raw === "number") return raw < 1e12 ? raw * 1000 : raw;
    const t = Date.parse(String(raw ?? ""));
    return Number.isNaN(t) ? NaN : t;
  };

  const mealsInRange = meals.filter((m) => {
    const raw = m.timestamp ?? m.createdAt;
    const t = toMillis(raw);
    return !Number.isNaN(t) && t >= startMs && t <= endMs;
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
