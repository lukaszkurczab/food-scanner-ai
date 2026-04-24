import type { Meal } from "@/types/meal";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import {
  getMealDayIndex,
  isMealInDayKeyRange,
} from "@/services/meals/mealMetadata";

export type StatsRange = { start: Date; end: Date };
export type StatsResult = {
  labels: string[];
  caloriesSeries: number[];
  totals: { kcal: number; protein: number; fat: number; carbs: number };
  averages: { kcal: number; protein: number; fat: number; carbs: number };
  goal?: number | null;
  progressPct?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getStatsForRange(
  meals: Meal[],
  range: StatsRange,
  userGoal?: number | null
): StatsResult {
  const rangeStart = new Date(range.start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(range.end);
  rangeEnd.setHours(0, 0, 0, 0);

  const startMs = rangeStart.getTime();
  const spanMs = Math.max(0, rangeEnd.getTime() - startMs);
  const days = Math.max(1, Math.floor(spanMs / DAY_MS) + 1);

  const labels = Array.from({ length: days }, (_, idx) => {
    const d = new Date(startMs + idx * DAY_MS);
    return days <= 7
      ? d.toLocaleDateString(undefined, { weekday: "short" })
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });

  const caloriesSeries = Array.from({ length: days }, () => 0);
  const dayHasValues = Array.from({ length: days }, () => false);

  const totals = meals.reduce(
    (acc, meal) => {
      if (!isMealInDayKeyRange(meal, { start: rangeStart, end: rangeEnd })) {
        return acc;
      }

      const dayIdx = getMealDayIndex(meal, rangeStart);
      const nutrients = calculateTotalNutrients([meal]);
      const kcal = Number(nutrients.kcal) || 0;
      const protein = Number(nutrients.protein) || 0;
      const fat = Number(nutrients.fat) || 0;
      const carbs = Number(nutrients.carbs) || 0;

      acc.kcal += kcal;
      acc.protein += protein;
      acc.fat += fat;
      acc.carbs += carbs;

      if (dayIdx !== null && dayIdx >= 0 && dayIdx < days) {
        caloriesSeries[dayIdx] += kcal;
        if (kcal > 0 || protein > 0 || fat > 0 || carbs > 0) {
          dayHasValues[dayIdx] = true;
        }
      }

      return acc;
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const firstActiveIdx = (() => {
    const idx = dayHasValues.findIndex(Boolean);
    return idx === -1 ? 0 : idx;
  })();
  const activeDays = Math.max(1, days - firstActiveIdx);

  const averages = {
    kcal: Math.round((totals.kcal || 0) / activeDays),
    protein: Math.round((totals.protein || 0) / activeDays),
    fat: Math.round((totals.fat || 0) / activeDays),
    carbs: Math.round((totals.carbs || 0) / activeDays),
  };

  const goal = userGoal ?? null;
  const progressPct =
    goal && goal > 0
      ? Math.round(
          (caloriesSeries.reduce((s, v) => s + v, 0) / (goal * activeDays)) * 100
        )
      : null;

  return { labels, caloriesSeries, totals, averages, goal, progressPct };
}
