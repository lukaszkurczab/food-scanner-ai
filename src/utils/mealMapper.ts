import type { Meal } from "@/src/types";

export function mapRawToMeal(raw: any): Meal {
  return {
    id: raw.id,
    name: raw.name,
    date: raw.date,
    photoUri: raw.photoUri ?? null,
    userUid: raw.userUid,
    source: raw.source,
    syncState: raw.syncState,
    lastUpdated: raw.lastUpdated,
    cloudId: raw.cloudId ?? undefined,
    nutrition: {
      kcal: raw.kcal,
      carbs: raw.carbs,
      fat: raw.fat,
      protein: raw.protein,
    },
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients
      : JSON.parse(raw.ingredients ?? "[]"),
  };
}

export function mapMealToRaw(meal: Meal): any {
  return {
    id: meal.id,
    name: meal.name,
    date: meal.date,
    photoUri: meal.photoUri ?? null,
    userUid: meal.userUid,
    source: meal.source,
    syncState: meal.syncState,
    lastUpdated: meal.lastUpdated,
    cloudId: meal.cloudId ?? null,
    kcal: meal.nutrition.kcal,
    carbs: meal.nutrition.carbs,
    fat: meal.nutrition.fat,
    protein: meal.nutrition.protein,
    ingredients: JSON.stringify(meal.ingredients ?? []),
  };
}
