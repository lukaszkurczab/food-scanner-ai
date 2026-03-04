import type { Meal } from "@/types/meal";
import { MealKind } from "@/types/notification";
import { getMealsPageLocal } from "@/services/offline/meals.repo";
import {
  getDayISOInclusiveRange,
  isIsoWithinInclusiveRange,
} from "./dayRange";

export function hasMealTypeToday(meals: Meal[], kind: MealKind): boolean {
  return meals.some((m) => m.type === kind);
}

export function isKcalBelowThreshold(
  consumed: number,
  threshold?: number | null
) {
  if (!threshold || threshold <= 0) return true;
  return consumed < threshold;
}

export async function fetchTodayMeals(uid: string): Promise<Meal[]> {
  const { startIso, endIso } = getDayISOInclusiveRange(new Date());
  const page = await getMealsPageLocal(uid, 200);
  return page.filter((m) =>
    isIsoWithinInclusiveRange(m.timestamp, startIso, endIso)
  );
}

export function sumConsumedKcal(meals: Meal[]): number {
  return meals.reduce((acc, m) => acc + Number(m.totals?.kcal || 0), 0);
}

export function isCalorieGoalNotMet(
  consumed: number,
  target?: number | null
): boolean {
  if (!target || target <= 0) return false;
  return consumed < target;
}

export function hasAnyMealsToday(meals: Meal[]): boolean {
  return meals.length > 0;
}
