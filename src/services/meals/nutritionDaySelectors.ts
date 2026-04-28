import { getMealsForDayKey, isCanonicalMealDayKey } from "@/services/meals/mealMetadata";
import type { Meal, Nutrients } from "@/types";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";

export type NutritionDayBucket = {
  dayKey: string;
  dayMeals: Meal[];
  mealCount: number;
  totals: Nutrients;
  hasPending: boolean;
  hasFailed: boolean;
  hasConflict: boolean;
};

export function buildNutritionDayBucket(
  meals: Meal[],
  dayKey: string,
): NutritionDayBucket {
  const normalizedDayKey = isCanonicalMealDayKey(dayKey) ? dayKey : "";
  const dayMeals = getMealsForDayKey(meals, normalizedDayKey, "asc");

  return {
    dayKey: normalizedDayKey,
    dayMeals,
    mealCount: dayMeals.length,
    totals: calculateTotalNutrients(dayMeals),
    hasPending: dayMeals.some((meal) => meal.syncState === "pending"),
    hasFailed: dayMeals.some((meal) => meal.syncState === "failed"),
    hasConflict: dayMeals.some((meal) => meal.syncState === "conflict"),
  };
}
