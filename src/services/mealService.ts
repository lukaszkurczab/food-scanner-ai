import { getApp } from "@react-native-firebase/app";
import NetInfo from "@react-native-community/netinfo";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
  setDoc,
  limit as fsLimit,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";
import type { Meal } from "@/types/meal";

const app = getApp();
const db = getFirestore(app);
const st = getStorage(app);

function mealsCol(uid: string) {
  return collection(db, "users", uid, "meals");
}
function mealDoc(uid: string, cloudId: string) {
  return doc(db, "users", uid, "meals", cloudId);
}
function myMealDoc(uid: string, mealId: string) {
  return doc(db, "users", uid, "myMeals", mealId);
}

export type MealsPage = { items: Meal[]; nextBefore: string | null };

export async function getMealsPage(
  uid: string,
  opts: { limit: number; before?: string | null }
): Promise<MealsPage> {
  const { limit, before } = opts;
  const constraints: any[] = [
    orderBy("timestamp", "desc"),
    fsLimit(limit) as any,
  ];
  if (before) constraints.unshift(where("timestamp", "<", before));
  const q = query(mealsCol(uid), ...constraints);
  const snap = await getDocs(q);
  const items = snap.docs.map((d: any) => ({
    ...(d.data() as Meal),
    cloudId: d.id,
  }));
  const nextBefore = items.length
    ? String(items[items.length - 1].timestamp)
    : null;
  return { items, nextBefore };
}

export function subscribeMeals(
  uid: string,
  cb: (items: Meal[]) => void
): () => void {
  const q = query(mealsCol(uid), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d: any) => ({
      ...(d.data() as Meal),
      cloudId: d.id,
    }));
    cb(items);
  });
}

export async function addOrUpdateMeal(
  uid: string,
  meal: Meal,
  opts?: { alsoSaveToMyMeals?: boolean }
): Promise<Meal> {
  const cloudId = meal.cloudId ?? uuidv4();
  const now = new Date().toISOString();

  let photoUrl: string | null | undefined = meal.photoUrl ?? null;
  if (photoUrl && photoUrl.startsWith("file:")) {
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      const path = `meals/${uid}/${cloudId}.jpg`;
      const r = ref(st, path);
      await putFile(r, photoUrl);
      photoUrl = await getDownloadURL(r);
    }
  }

  const normalized: Meal = {
    userUid: uid,
    mealId: meal.mealId || uuidv4(),
    timestamp: meal.timestamp,
    type: meal.type,
    name: meal.name ?? null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
    createdAt: meal.createdAt ?? now,
    updatedAt: now,
    syncState: "pending",
    source: meal.source ?? null,
    photoUrl: photoUrl ?? null,
    notes: meal.notes ?? null,
    tags: meal.tags ?? [],
    deleted: meal.deleted ?? false,
    cloudId,
  };

  const batch = writeBatch(db);
  batch.set(mealDoc(uid, cloudId), normalized as any, { merge: true });
  if (opts?.alsoSaveToMyMeals) {
    batch.set(
      myMealDoc(uid, normalized.mealId),
      { ...normalized, cloudId: normalized.mealId, source: "saved" } as any,
      { merge: true }
    );
  }
  await batch.commit();

  return { ...normalized, syncState: "synced" };
}

export async function deleteMealInFirestore(uid: string, cloudId: string) {
  await setDoc(
    mealDoc(uid, cloudId),
    { deleted: true, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

async function ensureDir(dir: string) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists)
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}
function localPhotoPath(uid: string, id: string) {
  return `${FileSystem.documentDirectory}meals/${uid}/${id}.jpg`;
}

export async function restoreMissingMealPhotos(
  uid: string,
  meals: Meal[]
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!uid || !Array.isArray(meals) || meals.length === 0) return out;

  const baseDir = `${FileSystem.documentDirectory}meals/${uid}`;
  await ensureDir(baseDir);

  for (const m of meals) {
    const id = String(m.cloudId || m.mealId || "");
    if (!id) continue;

    const url = m.photoUrl || "";
    const looksRemote = typeof url === "string" && /^https?:\/\//i.test(url);
    if (!looksRemote) continue;

    const target = localPhotoPath(uid, id);
    const info = await FileSystem.getInfoAsync(target);

    if (!info.exists) {
      try {
        await FileSystem.downloadAsync(url, target);
      } catch {
        try {
          const path = `meals/${uid}/${id}.jpg`;
          const r = ref(st, path);
          const freshUrl = await getDownloadURL(r);
          await FileSystem.downloadAsync(freshUrl, target);
        } catch {
          continue;
        }
      }
    }

    const finalInfo = await FileSystem.getInfoAsync(target);
    if (finalInfo.exists) out[id] = target;
  }

  return out;
}
