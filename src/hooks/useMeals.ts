// hooks/useMeals.ts
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
import {
  getStorage,
  ref as storageRef,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { savePhotoLocally } from "@utils/savePhotoLocally";

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
        const items = snap.docs
          .map((d: any) => ({ ...(d.data() as Meal), cloudId: d.id }))
          .filter((m: any) => !m.deleted);
        setMeals(items);
        setLoading(false);
      },
      (e) => {
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

  const getMeals = useCallback(async () => {
    console.log("[useMeals.getMeals] noop");
  }, []);

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
          const localPath = await savePhotoLocally({
            userUid,
            fileId: cloudId,
            photoUri: maybeUri,
          });
          const st = getStorage(app);
          const r = storageRef(st, `meals/${userUid}/${cloudId}.jpg`);
          await putFile(r, localPath, { contentType: "image/jpeg" });
          const url = await getDownloadURL(r);
          base.photoUrl = url as any;
          (base as any).photoLocalPath = localPath;
        }
      } catch (e) {
        console.log("[useMeals.addMeal] upload error", e);
      }
      const batch = writeBatch(db);
      batch.set(doc(db, "users", userUid, "meals", cloudId), base as any, {
        merge: true,
      });
      if (opts?.alsoSaveToMyMeals) {
        const libCopy: Meal = { ...(base as Meal), source: "saved" };
        batch.set(
          doc(db, "users", userUid, "myMeals", mealId),
          libCopy as any,
          { merge: true }
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
          const localPath = await savePhotoLocally({
            userUid,
            fileId: cloudId,
            photoUri: maybeUri,
          });
          const st = getStorage(app);
          const r = storageRef(st, `meals/${userUid}/${cloudId}.jpg`);
          await putFile(r, localPath, { contentType: "image/jpeg" });
          const url = await getDownloadURL(r);
          payload.photoUrl = url as any;
          (payload as any).photoLocalPath = localPath;
        }
      } catch (e) {
        console.log("[useMeals.updateMeal] upload error", e);
      }
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

  const syncMeals = useCallback(async () => {
    console.log("[useMeals.syncMeals] noop");
  }, []);

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
