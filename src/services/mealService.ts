import { getApp } from "@react-native-firebase/app";
import NetInfo from "@react-native-community/netinfo";
import { uploadImageFromLocal } from "./mealService.images";
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
  startAfter,
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

export const FREE_WINDOW_DAYS = 30;

function mealsCol(uid: string) {
  return collection(db, "users", uid, "meals");
}
function mealDoc(uid: string, cloudId: string) {
  return doc(db, "users", uid, "meals", cloudId);
}
function myMealDoc(uid: string, mealId: string) {
  return doc(db, "users", uid, "myMeals", mealId);
}

export type HistoryFilters = {
  calories?: [number, number];
  protein?: [number, number];
  carbs?: [number, number];
  fat?: [number, number];
  dateRange?: { start: Date; end: Date };
};

export type MealsPage = { items: Meal[]; nextBefore: string | null };
export type MealsPageV2 = {
  items: Meal[];
  nextCursor: any | null;
};

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
  const items = snap.docs
    .map((d: any) => ({ ...(d.data() as Meal), cloudId: d.id }))
    .filter((m: any) => !m.deleted);
  const nextBefore = items.length
    ? String(items[items.length - 1].timestamp)
    : null;
  return { items, nextBefore };
}

function clampDateRange(
  input: HistoryFilters["dateRange"] | undefined,
  accessWindowDays?: number
): HistoryFilters["dateRange"] | undefined {
  if (!accessWindowDays || accessWindowDays <= 0) return input;
  const now = new Date();
  const startWindow = new Date(now);
  startWindow.setDate(now.getDate() - accessWindowDays + 1);
  startWindow.setHours(0, 0, 0, 0);
  const endWindow = new Date(now);
  endWindow.setHours(23, 59, 59, 999);
  if (!input) return { start: startWindow, end: endWindow };
  const s = new Date(input.start);
  const e = new Date(input.end);
  const start = s < startWindow ? startWindow : s;
  const end = e > endWindow ? endWindow : e;
  if (start > end) return { start: new Date(0), end: new Date(0) };
  return { start, end };
}

function buildFilteredQuery(uid: string, filters?: HistoryFilters) {
  const parts: any[] = [];
  if (filters?.calories) {
    parts.push(where("totals.kcal", ">=", filters.calories[0]));
    parts.push(where("totals.kcal", "<=", filters.calories[1]));
  }
  if (filters?.protein) {
    parts.push(where("totals.protein", ">=", filters.protein[0]));
    parts.push(where("totals.protein", "<=", filters.protein[1]));
  }
  if (filters?.carbs) {
    parts.push(where("totals.carbs", ">=", filters.carbs[0]));
    parts.push(where("totals.carbs", "<=", filters.carbs[1]));
  }
  if (filters?.fat) {
    parts.push(where("totals.fat", ">=", filters.fat[0]));
    parts.push(where("totals.fat", "<=", filters.fat[1]));
  }
  if (filters?.dateRange) {
    const s = new Date(filters.dateRange.start);
    const e = new Date(filters.dateRange.end);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    parts.push(where("timestamp", ">=", s.toISOString()));
    parts.push(where("timestamp", "<=", e.toISOString()));
  }
  parts.push(orderBy("timestamp", "desc"));
  const qBuilt = query(mealsCol(uid), ...parts);
  return qBuilt;
}

export async function getMealsPageFiltered(
  uid: string,
  opts: {
    limit: number;
    cursor: any | null;
    filters?: HistoryFilters;
    accessWindowDays?: number;
  }
): Promise<MealsPageV2> {
  const effectiveFilters: HistoryFilters | undefined = (() => {
    const f = { ...(opts.filters || {}) };
    f.dateRange = clampDateRange(f.dateRange, opts.accessWindowDays);
    return f;
  })();
  const base = buildFilteredQuery(uid, effectiveFilters);
  const q = opts.cursor
    ? query(base, startAfter(opts.cursor), fsLimit(opts.limit))
    : query(base, fsLimit(opts.limit));
  const snap = await getDocs(q);
  const items = snap.docs
    .map((d: any) => ({ ...(d.data() as Meal), cloudId: d.id }))
    .filter((m: any) => !m.deleted);
  if (!items.length) return { items: [], nextCursor: null };
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { items, nextCursor: lastDoc };
}

export function subscribeMeals(
  uid: string,
  cb: (items: Meal[]) => void
): () => void {
  const q = query(mealsCol(uid), orderBy("timestamp", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d: any) => ({ ...(d.data() as Meal), cloudId: d.id }))
        .filter((m: any) => !m.deleted);
      cb(items);
    },
    () => {}
  );
}

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

export async function addOrUpdateMeal(
  uid: string,
  meal: Meal,
  opts?: { alsoSaveToMyMeals?: boolean }
): Promise<Meal> {
  const cloudId = meal.cloudId ?? uuidv4();
  const now = new Date().toISOString();
  let imageId: string | null | undefined = meal.imageId ?? null;
  let photoUrl: string | null | undefined = meal.photoUrl ?? null;
  if (
    (photoUrl && photoUrl.startsWith("file:")) ||
    (typeof meal as any).localPhotoUri
  ) {
    const localUri = (meal as any).localPhotoUri || photoUrl!;
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      const up = await uploadImageFromLocal(localUri);
      imageId = up.imageId;
      photoUrl = up.url;
    }
  }
  const totals = computeTotals(meal);
  const normalized: Meal = {
    userUid: uid,
    mealId: meal.mealId || uuidv4(),
    timestamp: meal.timestamp ?? now,
    type: meal.type,
    name: meal.name ?? null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
    createdAt: meal.createdAt ?? now,
    updatedAt: now,
    syncState: "pending",
    source: meal.source ?? null,
    imageId: imageId ?? meal.imageId ?? null,
    photoUrl: photoUrl ?? meal.photoUrl ?? null,
    notes: meal.notes ?? null,
    tags: meal.tags ?? [],
    deleted: meal.deleted ?? false,
    cloudId,
    totals: totals as any,
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
    let url = m.photoUrl || "";
    if (!url && m.imageId) {
      try {
        url = await getDownloadURL(ref(st, `images/${m.imageId}.jpg`));
      } catch {
        url = "";
      }
    }
    const looksRemote = typeof url === "string" && /^https?:\/\//i.test(url);
    if (!looksRemote) continue;
    const target = localPhotoPath(uid, id);
    const info = await FileSystem.getInfoAsync(target);
    if (!info.exists) {
      try {
        await FileSystem.downloadAsync(url, target);
      } catch {
        try {
          const legacyPath = `meals/${uid}/${id}.jpg`;
          const r = ref(st, legacyPath);
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
