import type { Meal } from "@/src/types";

export function mapRawToMeal(raw: any): Meal {
  return {
    id: raw.id,
    name: raw.name,
    date: raw.date,
    photoUri: raw.photo_uri ?? null,
    userUid: raw.user_uid,
    source: raw.source,
    syncStatus: raw.sync_status,
    lastUpdated: raw.last_updated,
    cloudId: raw.cloud_id ?? undefined,
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
    photo_uri: meal.photoUri ?? null,
    user_uid: meal.userUid,
    source: meal.source,
    sync_status: meal.syncStatus,
    last_updated: meal.lastUpdated,
    cloud_id: meal.cloudId ?? null,
    kcal: meal.nutrition.kcal,
    carbs: meal.nutrition.carbs,
    fat: meal.nutrition.fat,
    protein: meal.nutrition.protein,
    ingredients: JSON.stringify(meal.ingredients ?? []),
  };
}
