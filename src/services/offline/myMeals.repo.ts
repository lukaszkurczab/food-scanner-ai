import { getDB } from "./db";
import type { Meal } from "@/types/meal";
import type { MealRow } from "./types";
import { emit } from "@/services/core/events";

const MEAL_TYPES: Meal["type"][] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
];

function parseMealType(value: string | null): Meal["type"] {
  if (value && MEAL_TYPES.includes(value as Meal["type"])) {
    return value as Meal["type"];
  }
  return "other";
}

function parseMealSource(value: string | null): Meal["source"] {
  if (value === "ai" || value === "manual" || value === "saved") return value;
  return "saved";
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function rowToMeal(row: MealRow): Meal {
  const localPath = row.image_local ?? null;
  return {
    userUid: row.user_uid,
    mealId: row.meal_id,
    timestamp: row.timestamp,
    type: parseMealType(row.type),
    name: row.name,
    ingredients: [],
    createdAt: row.created_at ?? row.timestamp ?? row.updated_at,
    updatedAt: row.updated_at,
    syncState: "pending",
    source: parseMealSource(row.source),
    imageId: row.image_id ?? null,
    photoUrl: row.photo_url ?? null,
    photoLocalPath: localPath,
    localPhotoUrl: localPath,
    notes: row.notes ?? null,
    tags: parseTags(row.tags),
    deleted: Number(row.deleted ?? 0) === 1,
    cloudId: row.cloud_id ?? undefined,
    totals: {
      kcal: Number(row.totals_kcal ?? 0),
      protein: Number(row.totals_protein ?? 0),
      carbs: Number(row.totals_carbs ?? 0),
      fat: Number(row.totals_fat ?? 0),
    },
  };
}

export async function upsertMyMealLocal(meal: Meal): Promise<void> {
  const db = getDB();
  const cloudId = meal.cloudId ?? meal.mealId;
  const tags = JSON.stringify(meal.tags || []);
  const createdAt = meal.createdAt ?? meal.timestamp ?? meal.updatedAt;
  const localPath = meal.photoLocalPath ?? (meal.photoUrl?.startsWith("file:") ? meal.photoUrl : null);

  db.runSync(
    `INSERT INTO my_meals (
      cloud_id, meal_id, user_uid, timestamp, type, name,
      photo_url, image_local, image_id,
      totals_kcal, totals_protein, totals_carbs, totals_fat,
      deleted, created_at, updated_at, source, notes, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cloud_id) DO UPDATE SET
      meal_id=excluded.meal_id,
      timestamp=excluded.timestamp,
      type=excluded.type,
      name=excluded.name,
      photo_url=COALESCE(excluded.photo_url, photo_url),
      image_local=COALESCE(excluded.image_local, image_local),
      image_id=COALESCE(excluded.image_id, image_id),
      totals_kcal=excluded.totals_kcal,
      totals_protein=excluded.totals_protein,
      totals_carbs=excluded.totals_carbs,
      totals_fat=excluded.totals_fat,
      deleted=excluded.deleted,
      created_at=COALESCE(excluded.created_at, created_at),
      updated_at=excluded.updated_at,
      source=excluded.source,
      notes=excluded.notes,
      tags=excluded.tags`,
    [
      cloudId,
      meal.mealId,
      meal.userUid,
      meal.timestamp,
      meal.type,
      meal.name ?? null,
      localPath ? null : meal.photoUrl ?? null,
      localPath,
      meal.imageId ?? null,
      meal.totals?.kcal ?? 0,
      meal.totals?.protein ?? 0,
      meal.totals?.carbs ?? 0,
      meal.totals?.fat ?? 0,
      meal.deleted ? 1 : 0,
      createdAt,
      meal.updatedAt,
      meal.source ?? "saved",
      meal.notes ?? null,
      tags,
    ],
  );
  emit("mymeal:local:upserted", { cloudId, ts: meal.updatedAt });
}

export async function getMyMealsPageLocal(params: {
  uid: string;
  limit: number;
  cursor?: string | null;
}): Promise<{ items: Meal[]; nextCursor: string | null; hasMore: boolean }> {
  const db = getDB();
  const offset = Math.max(Number(params.cursor || 0), 0);
  const rows = db.getAllSync(
    `SELECT * FROM my_meals
     WHERE user_uid=? AND deleted=0
     ORDER BY name COLLATE NOCASE ASC, cloud_id ASC
     LIMIT ? OFFSET ?`,
    [params.uid, params.limit, offset],
  ) as MealRow[];
  const items = rows.map(rowToMeal);
  const nextOffset = offset + items.length;
  const nextCursor = items.length === params.limit ? String(nextOffset) : null;
  return {
    items,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

export async function getAllMyMealsLocal(uid: string): Promise<Meal[]> {
  const db = getDB();
  const rows = db.getAllSync(
    `SELECT * FROM my_meals
     WHERE user_uid=? AND deleted=0
     ORDER BY name COLLATE NOCASE ASC, cloud_id ASC`,
    [uid],
  ) as MealRow[];
  return rows.map(rowToMeal);
}

export async function markDeletedMyMealLocal(
  cloudId: string,
  updatedAt: string,
): Promise<void> {
  const db = getDB();
  db.runSync(
    `UPDATE my_meals SET deleted=1, updated_at=? WHERE cloud_id=?`,
    [updatedAt, cloudId],
  );
  emit("mymeal:local:deleted", { cloudId, ts: updatedAt });
}
