import type { Meal } from "@/types/meal";
import { get, post, upload } from "@/services/core/apiClient";
import { on } from "@/services/core/events";
import {
  getAllMyMealsLocal,
  getMyMealsPageLocal,
} from "@/services/offline/myMeals.repo";

export type MyMealDoc = Meal & {
  uploadState?: "pending" | "done";
  localPhotoUri?: string | null;
};

export type MyMealsCursor = string | null;

export type MyMealsPage = {
  items: Meal[];
  lastDoc: MyMealsCursor;
  hasMore: boolean;
};

type MyMealsRemoteResponse = {
  items?: unknown[];
  nextCursor?: string | null;
};

type UploadPhotoResponse = {
  mealId?: string;
  imageId?: string;
  photoUrl?: string;
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

  return {
    userUid,
    mealId,
    timestamp,
    type:
      meal.type === "breakfast" ||
      meal.type === "lunch" ||
      meal.type === "dinner" ||
      meal.type === "snack" ||
      meal.type === "other"
        ? meal.type
        : "other",
    name: typeof meal.name === "string" ? meal.name : null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
    createdAt: String(meal.createdAt || timestamp),
    updatedAt,
    syncState: "synced",
    source: "saved",
    imageId: typeof meal.imageId === "string" ? meal.imageId : null,
    photoUrl: typeof meal.photoUrl === "string" ? meal.photoUrl : null,
    notes: typeof meal.notes === "string" ? meal.notes : null,
    tags: Array.isArray(meal.tags)
      ? meal.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    deleted: Boolean(meal.deleted),
    cloudId,
    totals: {
      kcal: toFiniteNumber(meal.totals?.kcal),
      protein: toFiniteNumber(meal.totals?.protein),
      carbs: toFiniteNumber(meal.totals?.carbs),
      fat: toFiniteNumber(meal.totals?.fat),
    },
  };
}

function toRemotePage(payload: unknown): { items: Meal[]; nextCursor: string | null } {
  const page = (payload || {}) as MyMealsRemoteResponse;
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

export function buildMyMealUpdatedCursor(
  meal: Pick<Meal, "updatedAt" | "cloudId">,
): string {
  return `${meal.updatedAt}|${meal.cloudId || meal.updatedAt}`;
}

export function subscribeToMyMealsOrderedByName(params: {
  uid: string;
  onData: (items: Meal[]) => void;
  onError?: (error: unknown) => void;
}): () => void {
  let active = true;

  const publish = async () => {
    if (!active) return;
    try {
      const items = await getAllMyMealsLocal(params.uid);
      if (active) {
        params.onData(items);
      }
    } catch (error) {
      params.onError?.(error);
    }
  };

  void publish();

  const unsubs = [
    on("mymeal:local:upserted", () => void publish()),
    on("mymeal:local:deleted", () => void publish()),
    on("mymeal:synced", () => void publish()),
  ];

  return () => {
    active = false;
    unsubs.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeToMyMealsFirstPage(params: {
  uid: string;
  pageSize: number;
  onData: (page: MyMealsPage) => void;
  onError?: (error: unknown) => void;
}): () => void {
  let active = true;

  const publish = async () => {
    if (!active) return;
    try {
      const page = await getMyMealsPageLocal({
        uid: params.uid,
        limit: params.pageSize,
        cursor: null,
      });
      if (active) {
        params.onData({
          items: page.items,
          lastDoc: page.nextCursor,
          hasMore: page.hasMore,
        });
      }
    } catch (error) {
      params.onError?.(error);
    }
  };

  void publish();

  const unsubs = [
    on("mymeal:local:upserted", () => void publish()),
    on("mymeal:local:deleted", () => void publish()),
    on("mymeal:synced", () => void publish()),
  ];

  return () => {
    active = false;
    unsubs.forEach((unsubscribe) => unsubscribe());
  };
}

export async function fetchMyMealsPage(params: {
  uid: string;
  pageSize: number;
  lastDoc: string;
}): Promise<MyMealsPage> {
  const page = await getMyMealsPageLocal({
    uid: params.uid,
    limit: params.pageSize,
    cursor: params.lastDoc,
  });
  return {
    items: page.items,
    lastDoc: page.nextCursor,
    hasMore: page.hasMore,
  };
}

export async function fetchMyMealChangesRemote(params: {
  uid: string;
  pageSize: number;
  cursor: string | null;
}): Promise<{ items: Meal[]; nextCursor: string | null }> {
  void params.uid;
  const query = new URLSearchParams();
  query.set("limit", String(params.pageSize));
  if (params.cursor) {
    query.set("afterCursor", params.cursor);
  }

  const response = await get<MyMealsRemoteResponse>(
    `/users/me/my-meals/changes?${query.toString()}`,
  );
  return toRemotePage(response);
}

export async function updateMyMealRemote(
  uid: string,
  mealId: string,
  payload: MyMealDoc | Partial<MyMealDoc>,
): Promise<void> {
  void uid;
  await post("/users/me/my-meals", {
    ...payload,
    mealId,
    cloudId: mealId,
    source: "saved",
  });
}

export async function uploadMyMealPhotoRemote(
  uid: string,
  mealId: string,
  photoUri: string,
): Promise<{ imageId: string; photoUrl: string }> {
  void uid;
  const formData = new FormData();
  formData.append("file", {
    uri: photoUri,
    name: `${mealId}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);

  const response = await upload<UploadPhotoResponse>(
    `/users/me/my-meals/${encodeURIComponent(mealId)}/photo`,
    formData,
  );
  return {
    imageId: String(response.imageId || ""),
    photoUrl: String(response.photoUrl || ""),
  };
}

export async function markMyMealDeletedRemote(
  uid: string,
  mealId: string,
  updatedAt: string,
  syncState?: "synced",
): Promise<void> {
  void uid;
  void syncState;
  await post(`/users/me/my-meals/${encodeURIComponent(mealId)}/delete`, {
    updatedAt,
  });
}
