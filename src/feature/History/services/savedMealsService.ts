import * as FileSystem from "expo-file-system";
import { getApp } from "@react-native-firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query as fsQuery,
  setDoc,
  startAfter,
  type FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import type { Meal, MealType } from "@/types/meal";
import { emit } from "@/services/events";
import { enqueueMyMealDelete } from "@/services/offline/queue.repo";

const app = getApp();
const db = getFirestore(app);

type ToastEvent = { key: string; ns?: string };

export type SavedMealsCursor =
  | FirebaseFirestoreTypes.QueryDocumentSnapshot
  | null;

export type SavedMealsPage = {
  items: Meal[];
  lastDoc: SavedMealsCursor;
  hasMore: boolean;
};

const mapDocsToMeals = (
  docs: FirebaseFirestoreTypes.QueryDocumentSnapshot[],
): Meal[] =>
  docs
    .map((snapshot) => ({
      ...(snapshot.data() as Meal),
      cloudId: snapshot.id,
    }))
    .filter((meal) => !meal.deleted);

async function normalizeSavedMealPhotos(
  uid: string,
  meals: Meal[],
): Promise<Meal[]> {
  const normalized: Meal[] = [];

  for (const meal of meals) {
    const localUri =
      meal.photoLocalPath ??
      (meal.photoUrl?.startsWith("file://") ? meal.photoUrl : null);

    if (!localUri) {
      normalized.push(meal);
      continue;
    }

    try {
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        normalized.push(meal);
        continue;
      }
    } catch {
      // Ignore and clear stale local path below.
    }

    await setDoc(
      doc(db, "users", uid, "myMeals", meal.cloudId || meal.mealId),
      { photoUrl: null, photoLocalPath: null },
      { merge: true },
    );

    normalized.push({
      ...meal,
      photoUrl: null,
      photoLocalPath: null,
    });
  }

  return normalized;
}

export function subscribeSavedMealsFirstPage(params: {
  uid: string;
  pageSize: number;
  onData: (page: SavedMealsPage) => void | Promise<void>;
  onError: () => void;
}): () => void {
  const firstPageQuery = fsQuery(
    collection(db, "users", params.uid, "myMeals"),
    orderBy("name", "asc"),
    limit(params.pageSize),
  );

  return onSnapshot(
    firstPageQuery,
    async (snapshot) => {
      try {
        const meals = mapDocsToMeals(snapshot.docs);
        const normalized = await normalizeSavedMealPhotos(params.uid, meals);
        await params.onData({
          items: normalized,
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === params.pageSize,
        });
      } catch {
        params.onError();
      }
    },
    () => {
      params.onError();
    },
  );
}

export async function fetchSavedMealsPage(params: {
  uid: string;
  pageSize: number;
  lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot;
}): Promise<SavedMealsPage> {
  const pageQuery = fsQuery(
    collection(db, "users", params.uid, "myMeals"),
    orderBy("name", "asc"),
    startAfter(params.lastDoc),
    limit(params.pageSize),
  );

  const snapshot = await getDocs(pageQuery);
  const meals = mapDocsToMeals(snapshot.docs);
  const normalized = await normalizeSavedMealPhotos(params.uid, meals);

  return {
    items: normalized,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === params.pageSize,
  };
}

export async function deleteSavedMeal(params: {
  uid: string;
  cloudId: string;
  isOnline: boolean;
  nowISO?: string;
}): Promise<"deleted" | "queued"> {
  const nowISO = params.nowISO ?? new Date().toISOString();

  if (!params.isOnline) {
    await enqueueMyMealDelete(params.uid, params.cloudId, nowISO);
    emit<ToastEvent>("ui:toast", {
      key: "toast.savedMealDeleteQueued",
      ns: "common",
    });
    return "queued";
  }

  try {
    await setDoc(
      doc(db, "users", params.uid, "myMeals", params.cloudId),
      { deleted: true, updatedAt: nowISO },
      { merge: true },
    );
    return "deleted";
  } catch {
    await enqueueMyMealDelete(params.uid, params.cloudId, nowISO);
    return "queued";
  }
}

export async function updateSavedMeal(params: {
  uid: string;
  cloudId: string;
  meal: Meal;
  name: string;
  type: MealType;
  timestampISO: string;
  createdAtISO: string;
  nowISO?: string;
}): Promise<void> {
  const nowISO = params.nowISO ?? new Date().toISOString();

  const payload: Meal = {
    ...params.meal,
    name: params.name,
    type: params.type,
    timestamp: params.timestampISO,
    createdAt: params.createdAtISO,
    updatedAt: nowISO,
    source: "saved",
  };

  await setDoc(doc(db, "users", params.uid, "myMeals", params.cloudId), payload, {
    merge: true,
  });
}
