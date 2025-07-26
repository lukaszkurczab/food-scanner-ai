import { useState, useCallback, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import type { Meal } from "@/src/types";
import {
  fetchMealsFromFirestore,
  upsertMealInFirestore,
  deleteMealInFirestore,
} from "@/src/services/firestore/firestoreMealService";
import { mapRawToMeal, mapMealToRaw } from "@/src/utils/mealMapper";
import { v4 as uuidv4 } from "uuid";

const unsyncedStatuses: Meal["syncStatus"][] = ["pending", "conflict"];

export function useMeals(userUid: string) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const getMeals = useCallback(
    async (date?: string) => {
      const mealCollection = database.get("meals");
      let query = mealCollection.query();
      const all = await query.fetch();
      let userMeals = all.filter(
        (m: any) => m.user_uid === userUid && !m.deleted
      );
      if (date) {
        userMeals = userMeals.filter((m: any) => m.date === date);
      }
      setMeals(userMeals.map((m: any) => mapRawToMeal(m._raw)));
    },
    [userUid]
  );

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "id" | "syncStatus" | "lastUpdated" | "source">
    ) => {
      const mealCollection = database.get("meals");
      const newMeal: Meal = {
        ...meal,
        id: uuidv4(),
        source: "local",
        syncStatus: "pending",
        lastUpdated: new Date().toISOString(),
      };
      await database.write(async () => {
        await mealCollection.create((m: any) =>
          Object.assign(m, mapMealToRaw(newMeal))
        );
      });
      await getMeals();
    },
    [getMeals]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      const mealCollection = database.get("meals");
      const all = await mealCollection.query().fetch();
      const localMeal = all.find((m: any) => m.id === meal.id);
      if (localMeal) {
        await database.write(async () => {
          await localMeal.update((m: any) =>
            Object.assign(
              m,
              mapMealToRaw({
                ...meal,
                syncStatus: "pending",
                lastUpdated: new Date().toISOString(),
              })
            )
          );
        });
        await getMeals();
      }
    },
    [getMeals]
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      const mealCollection = database.get("meals");
      const all = await mealCollection.query().fetch();
      const localMeal = all.find((m: any) => m.id === mealId);
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

  const getUnsyncedMeals = useCallback(async () => {
    const mealCollection = database.get("meals");
    const all = await mealCollection.query().fetch();
    return all
      .filter(
        (m: any) =>
          m.user_uid === userUid && unsyncedStatuses.includes(m.sync_status)
      )
      .map((m: any) => mapRawToMeal(m._raw));
  }, [userUid]);

  const syncMeals = useCallback(async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    const mealCollection = database.get("meals");
    const allLocal = await mealCollection.query().fetch();
    const localMeals = allLocal.filter((m: any) => m.user_uid === userUid);

    for (const m of localMeals) {
      const meal = mapRawToMeal(m._raw);
      if (unsyncedStatuses.includes(meal.syncStatus)) {
        if (meal.deleted) {
          await deleteMealInFirestore(meal);
        } else {
          await upsertMealInFirestore(meal);
        }
        await database.write(async () => {
          await m.update((mm: any) => {
            mm.sync_status = "synced";
            mm.last_updated = new Date().toISOString();
          });
        });
      }
    }

    const remoteMeals = await fetchMealsFromFirestore(userUid);
    for (const remote of remoteMeals) {
      const local = localMeals.find((m: any) => m.id === remote.id);
      if (local) {
        const localMeal = mapRawToMeal(local._raw);
        if (new Date(remote.lastUpdated) > new Date(localMeal.lastUpdated)) {
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
  }, [userUid, getMeals]);

  useEffect(() => {
    getMeals();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncMeals();
    });
    return unsubscribe;
  }, [getMeals, syncMeals]);

  return {
    meals,
    loading,
    getMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    syncMeals,
    getUnsyncedMeals,
  };
}
