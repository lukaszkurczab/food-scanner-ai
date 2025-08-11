import { useState, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/db/database";
import type { Meal } from "@/types/meal";
import {
  fetchMealsFromFirestore,
  upsertMealWithPhoto,
  deleteMealInFirestore,
} from "@services/mealService";
import { mapRawToMeal, mapMealToRaw } from "@/utils/mealMapper";
import { v4 as uuidv4 } from "uuid";

const unsyncedStatuses: Meal["syncState"][] = ["pending", "conflict"];

function areMealsEqual(a: Meal[], b: Meal[]): boolean {
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
    const mealCollection = database.get("meals");
    const all = await mealCollection.query().fetch();
    const userMeals = all.filter(
      (m: any) => m.userUid === userUid && !m.deleted
    );
    const mealsArr = userMeals.map((m: any) => mapRawToMeal(m._raw));
    setMeals((prev) => (areMealsEqual(prev, mealsArr) ? prev : mealsArr));
    setLoading(false);
  }, [userUid]);

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "syncState" | "lastUpdated" | "source" | "updatedAt">
    ) => {
      const mealCollection = database.get("meals");
      const cloudId = meal.cloudId ?? uuidv4();
      const baseMeal: Meal = {
        ...meal,
        userUid,
        syncState: "pending",
        cloudId,
        source: "ai",
        updatedAt: new Date().toISOString(),
      };
      let syncState: Meal["syncState"] = "synced";
      try {
        await upsertMealWithPhoto(
          userUid,
          { ...baseMeal, syncState: "synced" },
          meal.photoUrl || null
        );
      } catch {
        syncState = "pending";
      }
      await database.write(async () => {
        const { id, ...raw } = mapMealToRaw({ ...baseMeal, syncState });
        await mealCollection.create((m: any) => Object.assign(m, raw));
      });
      await getMeals();
    },
    [getMeals, userUid]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      const mealCollection = database.get("meals");
      const all = await mealCollection.query().fetch();
      const localMeal = all.find((m: any) => m.id === meal.cloudId);
      let resultingSync: Meal["syncState"] = "synced";
      try {
        await upsertMealWithPhoto(
          userUid,
          { ...meal, syncState: "synced" },
          meal.photoUrl || null
        );
      } catch {
        resultingSync = "pending";
      }
      if (localMeal) {
        await database.write(async () => {
          await localMeal.update((m: any) =>
            Object.assign(
              m,
              mapMealToRaw({
                ...meal,
                syncState: resultingSync,
                updatedAt: new Date().toISOString(),
              })
            )
          );
        });
        await getMeals();
      }
    },
    [getMeals, userUid]
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      const mealCollection = database.get("meals");
      const all = await mealCollection.query().fetch();
      const localMeal = all.find((m: any) => m.id === mealCloudId);
      if (localMeal) {
        await database.write(async () => {
          await localMeal.update((m: any) => {
            m.deleted = true;
            m.sync_status = "pending";
            m.last_updated = new Date().toISOString();
          });
        });
        await getMeals();
      }
    },
    [getMeals]
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      const copy: Omit<Meal, "syncState" | "lastUpdated" | "updatedAt"> = {
        ...original,
        mealId: uuidv4(),
        cloudId: uuidv4(),
        timestamp: dateOverride || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: original.source || "manual",
        deleted: false,
      } as any;
      await addMeal(copy as any);
    },
    [addMeal]
  );

  const getUnsyncedMeals = useCallback(async () => {
    const mealCollection = database.get("meals");
    const all = await mealCollection.query().fetch();
    return all
      .filter(
        (m: any) =>
          m.userUid === userUid && unsyncedStatuses.includes(m.sync_status)
      )
      .map((m: any) => mapRawToMeal(m._raw));
  }, [userUid]);

  const syncMeals = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) return;
      const mealCollection = database.get("meals");
      const allLocal = await mealCollection.query().fetch();
      const localMeals = allLocal.filter((m: any) => m.userUid === userUid);
      const toSync = localMeals.filter((m: any) =>
        unsyncedStatuses.includes(m.sync_status)
      );
      if (toSync.length === 0) return;

      for (const m of toSync) {
        const meal = mapRawToMeal(m._raw);
        try {
          if (meal.deleted) {
            await deleteMealInFirestore(userUid, meal);
          } else {
            await upsertMealWithPhoto(userUid, meal, meal.photoUrl || null);
          }
          await database.write(async () => {
            await m.update((mm: any) => {
              mm.sync_status = "synced";
              mm.last_updated = new Date().toISOString();
            });
          });
        } catch {}
      }

      const remoteMeals = await fetchMealsFromFirestore(userUid);
      for (const remote of remoteMeals) {
        const local = localMeals.find((m: any) => m.id === remote.cloudId);
        if (local) {
          const localMeal = mapRawToMeal(local._raw);
          if (new Date(remote.updatedAt) > new Date(localMeal.updatedAt)) {
            await database.write(async () => {
              await local.update((m: any) =>
                Object.assign(m, mapMealToRaw(remote))
              );
            });
          }
        } else if (!remote.deleted) {
          await database.write(async () => {
            await mealCollection.create((m: any) =>
              Object.assign(m, mapMealToRaw(remote))
            );
          });
        }
      }
      await getMeals();
    } finally {
      syncingRef.current = false;
    }
  }, [userUid, getMeals]);

  return {
    meals,
    loading,
    getMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    duplicateMeal,
    syncMeals,
    getUnsyncedMeals,
  };
}
