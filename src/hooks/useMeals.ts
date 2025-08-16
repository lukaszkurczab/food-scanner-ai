import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meal } from "@/types/meal";
import { v4 as uuidv4 } from "uuid";
import {
  getMealsLocal,
  upsertMealLocal,
  softDeleteMealLocal,
  syncMeals as syncMealsRepo,
} from "@services/mealService";
import { getMealQueue, getMyMealQueue } from "@/sync/queues";
import { upsertMyMealLocal } from "@/services/myMealService";

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
    console.log("[MEALS] getMeals fetched", { count: list.length, userUid });
    setMeals((prev) => (eqByCloudId(prev, list) ? prev : list));
    setLoading(false);
  }, [userUid]);

  useEffect(() => {
    getMeals();
  }, [getMeals]);

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "syncState" | "updatedAt">,
      opts?: { alsoSaveToMyMeals?: boolean }
    ) => {
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

      console.log("[MEALS] addMeal start", {
        userUid,
        mealId: base.mealId,
        cloudId: base.cloudId,
        alsoSaveToMyMeals: !!opts?.alsoSaveToMyMeals,
        hasPhoto: !!base.photoUrl,
      });

      await upsertMealLocal(userUid, base);
      console.log("[MEALS] upsertMealLocal done");

      getMealQueue(userUid).enqueue({ kind: "upsert", userUid, meal: base });
      console.log("[QUEUE] enqueued meal upsert", {
        kind: "meal",
        userUid,
        mealId: base.mealId,
        cloudId: base.cloudId,
      });

      if (opts?.alsoSaveToMyMeals) {
        const libCopy: Meal = {
          ...base,
          cloudId: null as any,
          syncState: "pending",
          source: "saved",
        };
        console.log("[MYMEALS] libCopy prepare", {
          mealId: libCopy.mealId,
          cloudId: libCopy.cloudId,
        });
        await upsertMyMealLocal(userUid, libCopy);
        console.log("[MYMEALS] upsertMyMealLocal done");
        getMyMealQueue(userUid).enqueue({
          kind: "upsert",
          userUid,
          meal: libCopy,
        });
        console.log("[QUEUE] enqueued myMeal upsert", {
          kind: "myMeal",
          userUid,
          mealId: libCopy.mealId,
        });
      }

      await getMeals();
      console.log("[MEALS] addMeal finish");
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
