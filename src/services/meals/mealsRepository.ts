import type { Meal } from "@/types/meal";
import { get, post } from "@/services/core/apiClient";
import { updateMyMealRemote } from "@/services/meals/myMealsRepository";

export type MealHistoryFilters = {
  calories?: [number, number];
  protein?: [number, number];
  carbs?: [number, number];
  fat?: [number, number];
  dateRange?: { start: Date; end: Date };
};

export type MealsRemoteCursor = string | null;

export type MealsRemotePage = {
  items: Meal[];
  nextCursor: MealsRemoteCursor;
};

type MealsRemoteResponse = {
  items?: unknown[];
  nextCursor?: string | null;
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function computeTotalsFromIngredients(meal: Partial<Meal>) {
  const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];
  return {
    kcal: ingredients.reduce((sum, item) => sum + toFiniteNumber(item?.kcal), 0),
    protein: ingredients.reduce(
      (sum, item) => sum + toFiniteNumber(item?.protein),
      0,
    ),
    carbs: ingredients.reduce((sum, item) => sum + toFiniteNumber(item?.carbs), 0),
    fat: ingredients.reduce((sum, item) => sum + toFiniteNumber(item?.fat), 0),
  };
}

function normalizeMeal(raw: unknown): Meal | null {
  if (!raw || typeof raw !== "object") return null;
  const meal = raw as Partial<Meal>;
  const cloudId = String(meal.cloudId || meal.mealId || "").trim();
  const mealId = String(meal.mealId || cloudId).trim();
  const userUid = String(meal.userUid || "").trim();
  const timestamp = String(meal.timestamp || "").trim();
  const updatedAt = String(meal.updatedAt || "").trim();
  if (!cloudId || !mealId || !userUid || !timestamp || !updatedAt) {
    return null;
  }

  const type = meal.type;
  const normalizedType =
    type === "breakfast" ||
    type === "lunch" ||
    type === "dinner" ||
    type === "snack" ||
    type === "other"
      ? type
      : "other";

  const totals =
    meal.totals && typeof meal.totals === "object"
      ? {
          kcal: toFiniteNumber(meal.totals.kcal),
          protein: toFiniteNumber(meal.totals.protein),
          carbs: toFiniteNumber(meal.totals.carbs),
          fat: toFiniteNumber(meal.totals.fat),
        }
      : computeTotalsFromIngredients(meal);

  return {
    userUid,
    mealId,
    timestamp,
    dayKey: typeof meal.dayKey === "string" ? meal.dayKey : null,
    type: normalizedType,
    name: typeof meal.name === "string" ? meal.name : null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
    createdAt: String(meal.createdAt || timestamp),
    updatedAt,
    syncState: "synced",
    source:
      meal.source === "ai" || meal.source === "manual" || meal.source === "saved"
        ? meal.source
        : null,
    imageId: typeof meal.imageId === "string" ? meal.imageId : null,
    photoUrl: typeof meal.photoUrl === "string" ? meal.photoUrl : null,
    notes: typeof meal.notes === "string" ? meal.notes : null,
    tags: Array.isArray(meal.tags)
      ? meal.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    deleted: Boolean(meal.deleted),
    cloudId,
    totals,
  };
}

function toMealsPage(payload: unknown): MealsRemotePage {
  const page = (payload || {}) as MealsRemoteResponse;
  const items = Array.isArray(page.items)
    ? page.items
        .map((item) => normalizeMeal(item))
        .filter((item): item is Meal => item !== null)
    : [];

  return {
    items,
    nextCursor:
      typeof page.nextCursor === "string" && page.nextCursor.trim().length > 0
        ? page.nextCursor
        : null,
  };
}

function appendRangeParams(
  params: URLSearchParams,
  key: "calories" | "protein" | "carbs" | "fat",
  value?: [number, number],
) {
  if (!value) return;
  params.set(`${key}Min`, String(value[0]));
  params.set(`${key}Max`, String(value[1]));
}

function buildHistoryPath(input: {
  pageSize: number;
  cursor: MealsRemoteCursor;
  filters?: MealHistoryFilters;
}): string {
  const params = new URLSearchParams();
  params.set("limit", String(input.pageSize));
  if (input.cursor) {
    params.set("beforeCursor", input.cursor);
  }

  appendRangeParams(params, "calories", input.filters?.calories);
  appendRangeParams(params, "protein", input.filters?.protein);
  appendRangeParams(params, "carbs", input.filters?.carbs);
  appendRangeParams(params, "fat", input.filters?.fat);

  if (input.filters?.dateRange) {
    params.set("timestampStart", input.filters.dateRange.start.toISOString());
    params.set("timestampEnd", input.filters.dateRange.end.toISOString());
  }

  return `/users/me/meals/history?${params.toString()}`;
}

export function extractMealTimestampCursor(cursor: string | null): string | null {
  if (!cursor) return null;
  const normalized = cursor.trim();
  if (!normalized) return null;
  const pipeIndex = normalized.lastIndexOf("|");
  return pipeIndex === -1 ? normalized : normalized.slice(0, pipeIndex);
}

export function buildMealUpdatedCursor(
  meal: Pick<Meal, "updatedAt" | "cloudId">,
): string {
  return `${meal.updatedAt}|${meal.cloudId || meal.updatedAt}`;
}

export async function fetchMealsPageRemote(params: {
  uid: string;
  pageSize: number;
  cursor: MealsRemoteCursor;
  filters?: MealHistoryFilters;
}): Promise<MealsRemotePage> {
  void params.uid;
  const response = await get<MealsRemoteResponse>(
    buildHistoryPath({
      pageSize: params.pageSize,
      cursor: params.cursor,
      filters: params.filters,
    }),
  );
  return toMealsPage(response);
}

export async function fetchMealChangesRemote(params: {
  uid: string;
  pageSize: number;
  cursor: MealsRemoteCursor;
}): Promise<MealsRemotePage> {
  void params.uid;
  const query = new URLSearchParams();
  query.set("limit", String(params.pageSize));
  if (params.cursor) {
    query.set("afterCursor", params.cursor);
  }

  const response = await get<MealsRemoteResponse>(
    `/users/me/meals/changes?${query.toString()}`,
  );
  return toMealsPage(response);
}

export async function saveMealRemote(params: {
  uid: string;
  meal: Meal;
  alsoSaveToMyMeals?: boolean;
}): Promise<void> {
  await post("/users/me/meals", params.meal);
  if (params.alsoSaveToMyMeals) {
    await updateMyMealRemote(params.uid, params.meal.mealId, {
      ...params.meal,
      mealId: params.meal.mealId,
      cloudId: params.meal.mealId,
      source: "saved",
    });
  }
}

export async function markMealDeletedRemote(
  uid: string,
  cloudId: string,
  updatedAt: string,
): Promise<void> {
  void uid;
  await post(`/users/me/meals/${encodeURIComponent(cloudId)}/delete`, {
    updatedAt,
  });
}
