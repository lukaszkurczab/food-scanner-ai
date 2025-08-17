import { v4 as uuidv4 } from "uuid";
import type { Meal } from "@/types/meal";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  writeBatch,
  onSnapshot,
  collection,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  setDoc,
  updateDoc,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";

const app = getApp();
const db = getFirestore(app);
const st = getStorage(app);

function mealsCol(uid: string) {
  return collection(db, "users", uid, "meals");
}

function mealDoc(uid: string, cloudId: string) {
  return doc(db, "users", uid, "meals", cloudId);
}

function myMealsDoc(uid: string, mealId: string) {
  return doc(db, "users", uid, "myMeals", mealId);
}

export type MealsPage = {
  items: Meal[];
  nextCursor: any | null;
};

export function subscribeMeals(
  uid: string,
  onUpdate: (meals: Meal[]) => void,
  pageSize = 100
) {
  const q = query(mealsCol(uid), orderBy("timestamp", "desc"), limit(pageSize));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d: any) => {
      const data = d.data() as Meal;
      return { ...data, cloudId: d.id };
    });
    onUpdate(items);
  });
}

export async function fetchMealsPage(
  uid: string,
  pageSize = 50,
  cursor?: any | null
): Promise<MealsPage> {
  const base = query(
    mealsCol(uid),
    orderBy("timestamp", "desc"),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  const items = snap.docs.map((d: any) => ({
    ...(d.data() as Meal),
    cloudId: d.id,
  }));
  const nextCursor =
    snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
}

export async function upsertMeal(
  uid: string,
  meal: Meal,
  opts?: { alsoSaveToMyMeals?: boolean }
): Promise<string> {
  const now = new Date().toISOString();
  const cloudId = meal.cloudId || uuidv4();
  const mealData: Meal = {
    ...meal,
    cloudId,
    userUid: uid,
    createdAt: meal.createdAt || now,
    updatedAt: now,
  };
  const batch = writeBatch(db);
  batch.set(mealDoc(uid, cloudId), mealData, { merge: true });
  if (opts?.alsoSaveToMyMeals) {
    batch.set(
      myMealsDoc(uid, meal.mealId),
      { ...mealData, cloudId: meal.mealId, source: "saved" },
      { merge: true }
    );
  }
  await batch.commit();
  return cloudId;
}

export async function updateMeal(uid: string, meal: Meal): Promise<void> {
  const cloudId = meal.cloudId || uuidv4();
  const next: Meal = {
    ...meal,
    cloudId,
    userUid: uid,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(mealDoc(uid, cloudId), next, { merge: true });
}

export async function deleteMeal(uid: string, cloudId: string): Promise<void> {
  await updateDoc(mealDoc(uid, cloudId), {
    deleted: true,
    updatedAt: new Date().toISOString(),
  } as any);
}

export async function duplicateMeal(
  uid: string,
  original: Meal,
  dateOverride?: string
): Promise<string> {
  const nowIso = new Date().toISOString();
  const cloudId = uuidv4();
  const mealId = uuidv4();
  const copy: Meal = {
    ...original,
    cloudId,
    mealId,
    userUid: uid,
    createdAt: nowIso,
    updatedAt: nowIso,
    timestamp: dateOverride || nowIso,
    deleted: false,
  };
  await setDoc(mealDoc(uid, cloudId), copy, { merge: true });
  return cloudId;
}

export async function createMealWithLocalPhoto(
  uid: string,
  meal: Meal,
  localPhotoUri: string
): Promise<string> {
  const cloudId = meal.cloudId || uuidv4();
  const now = new Date().toISOString();
  const docData: Meal & {
    uploadState: "pending" | "done";
    localPhotoUri: string | null;
  } = {
    ...meal,
    cloudId,
    userUid: uid,
    createdAt: meal.createdAt || now,
    updatedAt: now,
    photoUrl: meal.photoUrl ?? null,
    uploadState: "pending",
    localPhotoUri,
  };
  await setDoc(mealDoc(uid, cloudId), docData as any, { merge: true });
  return cloudId;
}

export async function uploadMealPhotoOnline(
  uid: string,
  cloudId: string,
  localUri: string
): Promise<string> {
  const path = `meals/${uid}/${cloudId}.jpg`;
  const r = ref(st, path);
  await putFile(r, localUri);
  const url = await getDownloadURL(r);
  await setDoc(
    mealDoc(uid, cloudId),
    {
      photoUrl: url,
      uploadState: "done",
      localPhotoUri: null,
      updatedAt: new Date().toISOString(),
    } as any,
    { merge: true }
  );
  return url;
}
