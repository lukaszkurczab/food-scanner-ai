import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { savePhotoLocally } from "@utils/savePhotoLocally";
import { processAndUpload } from "@services/mealService.images";
import { cacheKeys, setJSON } from "@/services/cache";

const app = getApp();
const db = getFirestore(app);

function computeTotals(meal: Meal) {
  const ing = (meal.ingredients || []) as any[];
  const sum = (k: "kcal" | "protein" | "carbs" | "fat") =>
    ing.reduce((a, b) => a + (Number(b?.[k]) || 0), 0);
  return {
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
}

export function useMeals(userUid: string | null) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const subRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!userUid) {
      if (subRef.current) {
        subRef.current();
        subRef.current = null;
      }
      setMeals([]);
      setLoading(false);
      return;
    }
    if (subRef.current) return;
    const q = query(
      collection(db, "users", userUid, "meals"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Meal[] = snap.docs
          .map((d: any) => ({ ...(d.data() as Meal), cloudId: d.id } as Meal))
          .filter((m: Meal) => !m.deleted);
        setMeals(items);
        setLoading(false);
        // Persist last 7 days for offline history/stats
        try {
          const now = new Date();
          const cutoff = new Date(now);
          cutoff.setDate(now.getDate() - 7);
          const last7d = items.filter((m: Meal) => {
            const ts = new Date((m as any).timestamp || (m as any).createdAt);
            return ts >= cutoff;
          });
          if (userUid) void setJSON(cacheKeys.lastWeekMeals(userUid), last7d);
        } catch {}
      },
      () => {
        setLoading(false);
      }
    );
    subRef.current = unsub;
    return () => {
      if (subRef.current) {
        subRef.current();
        subRef.current = null;
      }
    };
  }, [userUid]);

  const getMeals = useCallback(async () => {}, []);

  const addMeal = useCallback(
    async (
      meal: Omit<Meal, "updatedAt" | "deleted">,
      opts?: { alsoSaveToMyMeals?: boolean }
    ) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const cloudId = (meal as any).cloudId ?? uuidv4();
      const mealId = (meal as any).mealId ?? uuidv4();
      const totals = computeTotals(meal as Meal);
      const base: Meal & { photoLocalPath?: string; totals?: any } = {
        ...(meal as Meal),
        userUid,
        cloudId,
        mealId,
        createdAt: (meal as any).createdAt ?? now,
        updatedAt: now,
        deleted: false,
        source: (meal as any).source ?? "manual",
        timestamp: (meal as any).timestamp ?? now,
        totals,
      };
      try {
        const maybeUri = (meal as any).photoUrl as string | undefined;
        const isLocal =
          typeof maybeUri === "string" &&
          (maybeUri.startsWith("file://") || maybeUri.startsWith("content://"));
        if (maybeUri && isLocal) {
          const up = await processAndUpload(userUid, maybeUri);
          base.imageId = up.imageId;
          base.photoUrl = up.cloudUrl as any;
          (base as any).photoLocalPath = await savePhotoLocally({
            userUid,
            fileId: cloudId,
            photoUri: up.cloudUrl,
          });
        }
      } catch {}
      const batch = writeBatch(db);
      batch.set(doc(db, "users", userUid, "meals", cloudId), base as any, {
        merge: true,
      });
      if (opts?.alsoSaveToMyMeals) {
        const libCopy: Meal = { ...(base as Meal), source: "saved" };
        batch.set(
          doc(db, "users", userUid, "myMeals", mealId),
          libCopy as any,
          {
            merge: true,
          }
        );
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
      const totals = computeTotals(meal);
      const payload: Meal & { photoLocalPath?: string; totals?: any } = {
        ...meal,
        cloudId,
        updatedAt: now,
        totals,
        timestamp: (meal as any).timestamp ?? now,
      };
      try {
        const maybeUri = (meal as any).photoUrl as string | undefined;
        const isLocal =
          typeof maybeUri === "string" &&
          (maybeUri.startsWith("file://") || maybeUri.startsWith("content://"));
        if (maybeUri && isLocal) {
          const up = await processAndUpload(userUid, maybeUri);
          payload.imageId = up.imageId;
          payload.photoUrl = up.cloudUrl as any;
          (payload as any).photoLocalPath = await savePhotoLocally({
            userUid,
            fileId: cloudId,
            photoUri: up.cloudUrl,
          });
        }
      } catch {}
      await setDoc(
        doc(db, "users", userUid, "meals", cloudId),
        payload as any,
        { merge: true }
      );
    },
    [userUid]
  );

  const deleteMeal = useCallback(
    async (mealCloudId: string) => {
      if (!userUid || !mealCloudId) return;
      const now = new Date().toISOString();
      await setDoc(
        doc(db, "users", userUid, "meals", mealCloudId),
        { deleted: true, updatedAt: now } as Partial<Meal>,
        { merge: true }
      );
    },
    [userUid]
  );

  const duplicateMeal = useCallback(
    async (original: Meal, dateOverride?: string) => {
      if (!userUid) return;
      const now = new Date().toISOString();
      const newCloudId = uuidv4();
      const newMealId = uuidv4();
      const totals = computeTotals(original);
      const copy: Meal = {
        ...original,
        userUid,
        cloudId: newCloudId,
        mealId: newMealId,
        timestamp: dateOverride || now,
        createdAt: now,
        updatedAt: now,
        deleted: false,
        totals,
      };
      await setDoc(
        doc(db, "users", userUid, "meals", newCloudId),
        copy as any,
        { merge: true }
      );
    },
    [userUid]
  );

  const syncMeals = useCallback(async () => {}, []);
  const getUnsyncedMeals = useCallback(async () => {
    return [] as Meal[];
  }, []);

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
