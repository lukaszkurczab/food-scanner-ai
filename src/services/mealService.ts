import NetInfo from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import * as FileSystem from "expo-file-system";
import type { Meal } from "@/types/meal";
import {
  processAndUpload,
  ensureLocalMealPhoto,
  localPhotoPath,
} from "./mealService.images";
import {
  getMealsPageLocal,
  getMealsPageLocalFiltered,
  type LocalHistoryFilters,
} from "@/services/offline/meals.repo";
import { on, emit } from "@/services/events";
import {
  extractMealTimestampCursor,
  fetchMealsPageRemote,
  markMealDeletedRemote,
  saveMealRemote,
  type MealHistoryFilters,
} from "@/services/mealsRepository";
import { formatStreakDate } from "@/services/streak.logic";
export const FREE_WINDOW_DAYS = 30;
export type HistoryFilters = MealHistoryFilters;

export type MealsPage = { items: Meal[]; nextBefore: string | null };
export type MealsPageV2 = {
  items: Meal[];
  nextCursor: string | null;
};

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

export async function getMealsPageFiltered(
  uid: string,
  opts: {
    limit: number;
    cursor: string | null;
    filters?: HistoryFilters;
    accessWindowDays?: number;
  }
): Promise<MealsPageV2> {
  const effectiveFilters: HistoryFilters | undefined = (() => {
    const f = { ...(opts.filters || {}) };
    f.dateRange = clampDateRange(f.dateRange, opts.accessWindowDays);
    return f;
  })();

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    const localFilters: LocalHistoryFilters | undefined = effectiveFilters
      ? {
          calories: effectiveFilters.calories,
          protein: effectiveFilters.protein,
          carbs: effectiveFilters.carbs,
          fat: effectiveFilters.fat,
          dateRange: effectiveFilters.dateRange
            ? {
                start: new Date(effectiveFilters.dateRange.start),
                end: new Date(effectiveFilters.dateRange.end),
              }
            : undefined,
        }
      : undefined;

    const beforeISO =
      typeof opts.cursor === "string" && opts.cursor
        ? extractMealTimestampCursor(opts.cursor)
        : null;

    const page = await getMealsPageLocalFiltered(uid, {
      limit: opts.limit,
      beforeISO,
      filters: localFilters,
    });

    return { items: page.items, nextCursor: page.nextBefore };
  }

  const remotePage = await fetchMealsPageRemote({
    uid,
    pageSize: opts.limit,
    cursor: opts.cursor,
    filters: effectiveFilters,
  });
  if (!remotePage.items.length) return { items: [], nextCursor: null };
  return remotePage;
}

export function subscribeMeals(
  uid: string,
  cb: (items: Meal[]) => void
): () => void {
  let active = true;

  const publish = async () => {
    if (!active) return;
    const items = await getMealsPageLocal(uid, 50, undefined);
    if (active) {
      cb(items);
    }
  };

  void publish();

  const unsubs = [
    on("meal:local:upserted", () => void publish()),
    on("meal:local:deleted", () => void publish()),
    on("meal:synced", () => void publish()),
  ];

  return () => {
    active = false;
    unsubs.forEach((unsubscribe) => unsubscribe());
  };
}

function computeTotals(meal: Meal) {
  const ing = meal.ingredients || [];
  const sum = (k: "kcal" | "protein" | "carbs" | "fat") =>
    ing.reduce((a, b) => a + (Number(b?.[k]) || 0), 0);
  return {
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
}

function resolveMealDayKey(meal: Pick<Meal, "dayKey" | "timestamp">): string {
  if (meal.dayKey) return meal.dayKey;
  return formatStreakDate(new Date(meal.timestamp));
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
  const mealWithLegacyLocal = meal as Meal & { localPhotoUri?: string | null };
  const legacyLocalUri = mealWithLegacyLocal.localPhotoUri ?? null;

  if (
    (photoUrl &&
      (photoUrl.startsWith("file:") || photoUrl.startsWith("content:"))) ||
    legacyLocalUri
  ) {
    const localUri = legacyLocalUri || photoUrl!;
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      const up = await processAndUpload(uid, localUri);
      imageId = up.imageId;
      photoUrl = up.cloudUrl;
    }
  }

  const totals = computeTotals(meal);
  const normalized: Meal = {
    userUid: uid,
    mealId: meal.mealId || uuidv4(),
    timestamp: meal.timestamp ?? now,
    dayKey: resolveMealDayKey({
      dayKey: meal.dayKey ?? null,
      timestamp: meal.timestamp ?? now,
    }),
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
    totals,
  };
  await saveMealRemote({
    uid,
    meal: normalized,
    alsoSaveToMyMeals: opts?.alsoSaveToMyMeals,
  });
  emit("meal:added", { uid, meal: { ...normalized, syncState: "synced" } });
  return { ...normalized, syncState: "synced" };
}

export async function deleteMealInFirestore(uid: string, cloudId: string) {
  await markMealDeletedRemote(uid, cloudId, new Date().toISOString());
}

async function ensureDir(dir: string) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists)
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
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
    const id = String(m.cloudId || m.mealId || "").trim();
    if (!id) continue;

    const target = localPhotoPath(uid, id);
    const info = await FileSystem.getInfoAsync(target);
    if (info.exists) {
      out[id] = target;
      continue;
    }

    const local = await ensureLocalMealPhoto({
      uid,
      cloudId: m.cloudId ?? null,
      imageId: m.imageId ?? null,
      photoUrl: m.photoUrl ?? null,
    });

    if (local) out[id] = local;
  }
  return out;
}
