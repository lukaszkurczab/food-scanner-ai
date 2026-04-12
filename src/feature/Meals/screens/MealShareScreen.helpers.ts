import type { RootStackParamList } from "@/navigation/navigate";
import type { ShareMealContext, ShareNutrition } from "@/feature/Meals/shareComposer/types";

type ShareMeal = RootStackParamList["MealShare"]["meal"];

export const CANVAS_RATIO = 506 / 333;
export const CANVAS_MIN_WIDTH = 280;
export const CANVAS_MAX_WIDTH = 360;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveMealContext(
  input: RootStackParamList["MealShare"]["returnTo"],
): ShareMealContext {
  if (input === "MealDetails") {
    return "meal_details";
  }
  if (input === "ReviewMeal") {
    return "review_meal";
  }
  return "unknown";
}

export function resolveMealTitle(input: {
  meal: ShareMeal;
  fallback: string;
}): string {
  return input.meal.name?.trim() || input.fallback;
}

export function resolveShareNutrition(meal: ShareMeal): ShareNutrition {
  if (meal.totals) {
    return {
      kcal: Math.round(meal.totals.kcal || 0),
      protein: Math.round(meal.totals.protein || 0),
      carbs: Math.round(meal.totals.carbs || 0),
      fat: Math.round(meal.totals.fat || 0),
    };
  }

  const sums = (meal.ingredients || []).reduce(
    (acc, ingredient) => ({
      kcal: acc.kcal + (Number(ingredient.kcal) || 0),
      protein: acc.protein + (Number(ingredient.protein) || 0),
      carbs: acc.carbs + (Number(ingredient.carbs) || 0),
      fat: acc.fat + (Number(ingredient.fat) || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    kcal: Math.round(sums.kcal),
    protein: Math.round(sums.protein),
    carbs: Math.round(sums.carbs),
    fat: Math.round(sums.fat),
  };
}
