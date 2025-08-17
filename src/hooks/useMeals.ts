import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Meal } from "@/types/meal";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "@react-native-firebase/firestore";

const app = getApp();
const db = getFirestore(app);

export function useMeals(userUid: string) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userUid) {
      setMeals([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "users", userUid, "meals"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d: any) => {
          const data = d.data() as Meal;
          return { ...data, cloudId: d.id };
        })
        .filter((m: any) => !m.deleted);
      setMeals(items);
      setLoading(false);
    });
    return unsub;
  }, [userUid]);

  const getMeals = useCallback(async () => {}, []);

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "updatedAt" | "deleted">,
      opts?: { alsoSaveToMyMeals?: boolean }
    ) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const cloudId = meal.cloudId ?? uuidv4();
      const mealId = meal.mealId ?? uuidv4();

      const base: Meal = {
        ...meal,
        userUid,
        cloudId,
        mealId,
        createdAt: meal.createdAt ?? now,
        updatedAt: now,
        deleted: false,
        source: meal.source ?? "manual",
      };

      const batch = writeBatch(db);
      const mealRef = doc(db, "users", userUid, "meals", cloudId);
      batch.set(mealRef, base, { merge: true });

      if (opts?.alsoSaveToMyMeals) {
        const myRef = doc(db, "users", userUid, "myMeals", mealId);
        const libCopy: Meal = { ...base, source: "saved" };
        batch.set(myRef, libCopy, { merge: true });
      }

      await batch.commit();
    },
    [userUid]
  );

  const updateMeal = useCallback(
    async (meal: Meal) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const cloudId = meal.cloudId ?? uuidv4();
      const ref = doc(db, "users", userUid, "meals", cloudId);
      const payload: Meal = { ...meal, cloudId, updatedAt: now };
      await setDoc(ref, payload, { merge: true });
    },
    [userUid]
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!userUid || !mealCloudId) return;
      const now = new Date().toISOString();
      const ref = doc(db, "users", userUid, "meals", mealCloudId);
      await setDoc(ref, { deleted: true, updatedAt: now } as Partial<Meal>, {
        merge: true,
      });
    },
    [userUid]
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const newCloudId = uuidv4();
      const newMealId = uuidv4();
      const copy: Meal = {
        ...original,
        cloudId: newCloudId,
        mealId: newMealId,
        timestamp: dateOverride || now,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };
      const ref = doc(db, "users", userUid, "meals", newCloudId);
      await setDoc(ref, copy, { merge: true });
    },
    [userUid]
  );

  const syncMeals = useCallback(async () => {}, []);
  const getUnsyncedMeals = useCallback(async () => [] as Meal[], []);

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
