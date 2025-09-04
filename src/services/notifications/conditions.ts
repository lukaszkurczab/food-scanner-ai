import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "@react-native-firebase/firestore";
import type { Meal } from "@/types/meal";
import { MealKind } from "@/types/notification";

function startOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayISO(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

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
  const app = getApp();
  const db = getFirestore(app);
  const s = startOfDayISO(new Date());
  const e = endOfDayISO(new Date());
  const q = query(
    collection(db, "users", uid, "meals"),
    where("timestamp", ">=", s),
    where("timestamp", "<=", e)
  );
  const snap = await getDocs(q);
  const items = snap.docs
    .map((d: any) => d.data() as Meal)
    .filter((m: any) => !m.deleted);
  return items;
}

export function sumConsumedKcal(meals: Meal[]): number {
  return meals.reduce((acc, m: any) => acc + Number(m?.totals?.kcal || 0), 0);
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
