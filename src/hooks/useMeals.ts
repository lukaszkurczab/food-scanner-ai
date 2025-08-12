import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meal } from "@/types/meal";
import { v4 as uuidv4 } from "uuid";
import {
  getMealsLocal,
  upsertMealLocal,
  softDeleteMealLocal,
  syncMeals as syncMealsRepo,
} from "@services/mealService";
import { getMealQueue } from "@/sync/queues";

function eqByCloudId(a: Meal[], b: Meal[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++)
    if (a[i].cloudId !== b[i].cloudId) return false;
  return true;
}

export function useMeals(userUid: string) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);

  const getMeals = useCallback(async () => {
    if (!userUid) {
      setMeals([]);
      setLoading(false);
      return;
    }
    const list = await getMealsLocal(userUid);
    setMeals((prev) => (eqByCloudId(prev, list) ? prev : list));
    setLoading(false);
  }, [userUid]);

  useEffect(() => {
    getMeals();
  }, [getMeals]);

  const addMeal = useCallback(
    async (meal: Omit<Meal, "syncState" | "updatedAt">) => {
      const now = new Date().toISOString();
      const base: Meal = {
        ...meal,
        userUid,
        syncState: "pending",
        source: meal.source ?? "manual",
        updatedAt: now,
        createdAt: meal.createdAt ?? now,
        cloudId: meal.cloudId ?? uuidv4(),
        mealId: meal.mealId ?? uuidv4(),
      };
      await upsertMealLocal(userUid, base);
      getMealQueue(userUid).enqueue({ kind: "upsert", userUid, meal: base });
      await getMeals();
    },
    [userUid, getMeals]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      const updated: Meal = {
        ...meal,
        updatedAt: new Date().toISOString(),
        syncState: "pending",
      };
      await upsertMealLocal(userUid, updated);
      getMealQueue(userUid).enqueue({ kind: "upsert", userUid, meal: updated });
      await getMeals();
    },
    [userUid, getMeals]
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!mealCloudId) return;
      await softDeleteMealLocal(userUid, mealCloudId);
      getMealQueue(userUid).enqueue({
        kind: "delete",
        userUid,
        cloudId: mealCloudId,
      });
      await getMeals();
    },
    [userUid, getMeals]
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      const copy: Omit<Meal, "syncState" | "updatedAt"> = {
        ...original,
        mealId: uuidv4(),
        cloudId: uuidv4(),
        timestamp: dateOverride || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        deleted: false,
      };
      await addMeal(copy as any);
    },
    [addMeal]
  );

  const syncMeals = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      await syncMealsRepo(userUid);
      await getMeals();
    } finally {
      syncingRef.current = false;
    }
  }, [userUid, getMeals]);

  const getUnsyncedMeals = useCallback(async () => {
    const list = await getMealsLocal(userUid);
    return list.filter((m) => m.syncState !== "synced");
  }, [userUid]);

  return useMemo(
    () => ({
      meals,
      loading,
      getMeals,
      addMeal,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    }),
    [
      meals,
      loading,
      getMeals,
      addMeal,
      updateMeal,
      deleteMeal,
      duplicateMeal,
      syncMeals,
      getUnsyncedMeals,
    ]
  );
}
