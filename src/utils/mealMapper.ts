import type { Meal } from "@/src/types";

export function mapRawToMeal(raw: any): Meal {
  return {
    userUid: raw.userUid,
    mealId: raw.mealId,
    timestamp: raw.timestamp,
    type: raw.type,
    name: raw.name ?? null,
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients
      : JSON.parse(raw.ingredients ?? "[]"),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    syncState: raw.syncState,
    source: raw.source,
    photoUrl: raw.photoUrl ?? null,
    notes: raw.notes ?? null,
    tags: raw.tags ? JSON.parse(raw.tags) : [],
    deleted: raw.deleted ?? false,
    cloudId: raw.cloudId ?? undefined,
  };
}

export function mapMealToRaw(meal: Meal): any {
  return {
    userUid: meal.userUid,
    mealId: meal.mealId,
    timestamp: meal.timestamp,
    type: meal.type,
    name: meal.name ?? null,
    ingredients: JSON.stringify(meal.ingredients ?? []),
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
    syncState: meal.syncState,
    source: meal.source,
    photoUrl: meal.photoUrl ?? null,
    notes: meal.notes ?? null,
    tags: meal.tags ? JSON.stringify(meal.tags) : null,
    deleted: meal.deleted ?? false,
    cloudId: meal.cloudId ?? null,
  };
}
