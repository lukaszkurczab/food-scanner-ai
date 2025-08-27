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
import {
  getStorage,
  ref as storageRef,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { savePhotoLocally } from "@utils/savePhotoLocally";

const app = getApp();
const db = getFirestore(app);

export function useMeals(userUid: string | null) {
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

      const base: Meal & { photoLocalPath?: string } = {
        ...(meal as Meal),
        userUid,
        cloudId,
        mealId,
        createdAt: meal.createdAt ?? now,
        updatedAt: now,
        deleted: false,
        source: meal.source ?? "manual",
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
        console.log(e);
      }

      const batch = writeBatch(db);
      const mealRef = doc(db, "users", userUid, "meals", cloudId);
      batch.set(mealRef, base as any, { merge: true });

      if (opts?.alsoSaveToMyMeals) {
        const myRef = doc(db, "users", userUid, "myMeals", mealId);
        const libCopy: Meal = { ...(base as Meal), source: "saved" };
        batch.set(myRef, libCopy as any, { merge: true });
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

      let payload: Meal & { photoLocalPath?: string } = {
        ...meal,
        cloudId,
        updatedAt: now,
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
      } catch {}

      const ref = doc(db, "users", userUid, "meals", cloudId);
      await setDoc(ref, payload as any, { merge: true });
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
        userUid,
        cloudId: newCloudId,
        mealId: newMealId,
        timestamp: dateOverride || now,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      };
      const ref = doc(db, "users", userUid, "meals", newCloudId);
      await setDoc(ref, copy as any, { merge: true });
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
