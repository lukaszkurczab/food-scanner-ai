import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import NetInfo from "@react-native-community/netinfo";
import type { Meal } from "@/types/meal";
import { MealKind } from "@/types/notification";
import { getMealsPageLocal } from "@/services/offline/meals.repo";
import {
  getDayISOInclusiveRange,
  isIsoWithinInclusiveRange,
} from "./dayRange";
import { isRecord } from "@/services/contracts/guards";

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

function isMeal(value: unknown): value is Meal {
  if (!isRecord(value)) return false;
  return (
    typeof value.userUid === "string" &&
    typeof value.mealId === "string" &&
    typeof value.timestamp === "string" &&
    typeof value.type === "string" &&
    (typeof value.name === "string" || value.name === null) &&
    Array.isArray(value.ingredients) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.syncState === "string"
  );
}

export async function fetchTodayMeals(uid: string): Promise<Meal[]> {
  const net = await NetInfo.fetch();
  const { startIso, endIso } = getDayISOInclusiveRange(new Date());

  if (!net.isConnected) {
    const page = await getMealsPageLocal(uid, 200);
    return page.filter((m) =>
      isIsoWithinInclusiveRange(m.timestamp, startIso, endIso)
    );
  }

  const app = getApp();
  const db = getFirestore(app);
  const q = query(
    collection(db, "users", uid, "meals"),
    where("timestamp", ">=", startIso),
    where("timestamp", "<=", endIso)
  );
  const snap = await getDocs(q);
  const items: Meal[] = snap.docs
    .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => d.data())
    .filter(isMeal)
    .filter((m: Meal) => !m.deleted);
  return items;
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
