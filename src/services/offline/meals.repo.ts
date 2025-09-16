import { getDB } from "./db";
import type { Meal } from "@/types/meal";

/**
 * Insert or update a meal in local SQLite.
 */
export async function upsertMealLocal(meal: Meal): Promise<void> {
  const db = getDB();
  const tags = JSON.stringify(meal.tags || []);

  db.runSync(
    `INSERT INTO meals (
      cloud_id, meal_id, user_uid, timestamp, type, name,
      photo_url, image_local,
      totals_kcal, totals_protein, totals_carbs, totals_fat,
      deleted, updated_at, source, notes, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cloud_id) DO UPDATE SET
      meal_id=excluded.meal_id,
      timestamp=excluded.timestamp,
      type=excluded.type,
      name=excluded.name,
      photo_url=excluded.photo_url,
      image_local=excluded.image_local,
      totals_kcal=excluded.totals_kcal,
      totals_protein=excluded.totals_protein,
      totals_carbs=excluded.totals_carbs,
      totals_fat=excluded.totals_fat,
      deleted=excluded.deleted,
      updated_at=excluded.updated_at,
      source=excluded.source,
      notes=excluded.notes,
      tags=excluded.tags`,
    [
      meal.cloudId,
      meal.mealId,
      meal.userUid,
      meal.timestamp,
      meal.type,
      meal.name,
      meal.photoUrl,
      (meal as any).photoLocalPath || null,
      meal.totals?.kcal ?? 0,
      meal.totals?.protein ?? 0,
      meal.totals?.carbs ?? 0,
      meal.totals?.fat ?? 0,
      meal.deleted ? 1 : 0,
      meal.updatedAt,
      meal.source,
      meal.notes,
      tags,
    ]
  );
}

/**
 * Get a page of meals for a user, ordered by timestamp DESC.
 */
export async function getMealsPageLocal(
  uid: string,
  limit: number,
  beforeISO?: string
): Promise<Meal[]> {
  const db = getDB();
  const rows = beforeISO
    ? db.getAllSync(
        `SELECT * FROM meals
         WHERE user_uid=? AND deleted=0 AND timestamp<?
         ORDER BY timestamp DESC LIMIT ?`,
        [uid, beforeISO, limit]
      )
    : db.getAllSync(
        `SELECT * FROM meals
         WHERE user_uid=? AND deleted=0
         ORDER BY timestamp DESC LIMIT ?`,
        [uid, limit]
      );
  return rows as Meal[];
}

/**
 * Mark a meal as deleted (soft delete).
 */
export async function markDeletedLocal(
  cloudId: string,
  updatedAt: string
): Promise<void> {
  const db = getDB();
  db.runSync(`UPDATE meals SET deleted=1, updated_at=? WHERE cloud_id=?`, [
    updatedAt,
    cloudId,
  ]);
}
