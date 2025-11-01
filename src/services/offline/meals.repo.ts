import { getDB } from "./db";
import type { Meal } from "@/types/meal";
import type { MealRow } from "./types";
import { emit } from "@/services/events";

export async function upsertMealLocal(meal: Meal): Promise<void> {
  const db = getDB();
  const tags = JSON.stringify(meal.tags || []);
  const createdAt = meal.createdAt ?? meal.timestamp ?? meal.updatedAt;

  db.runSync(
    `INSERT INTO meals (
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
      photo_url=excluded.photo_url,
      image_local=excluded.image_local,
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
      meal.cloudId,
      meal.mealId,
      meal.userUid,
      meal.timestamp,
      meal.type,
      meal.name,
      meal.photoUrl,
      (meal as any).photoLocalPath || null,
      meal.imageId ?? null,
      meal.totals?.kcal ?? 0,
      meal.totals?.protein ?? 0,
      meal.totals?.carbs ?? 0,
      meal.totals?.fat ?? 0,
      meal.deleted ? 1 : 0,
      createdAt,
      meal.updatedAt,
      meal.source,
      meal.notes,
      tags,
    ]
  );
  emit("meal:local:upserted", { cloudId: meal.cloudId, ts: meal.updatedAt });
}

function rowToMeal(r: MealRow): Meal {
  return {
    userUid: r.user_uid,
    mealId: r.meal_id,
    timestamp: r.timestamp,
    type: r.type as any,
    name: r.name,
    ingredients: [],
    createdAt: r.created_at ?? r.timestamp ?? r.updated_at,
    updatedAt: r.updated_at,
    syncState: "pending",
    source: (r.source as any) ?? null,
    imageId: r.image_id ?? null,
    photoUrl: r.photo_url ?? null,
    notes: r.notes ?? null,
    tags: (() => {
      try {
        return r.tags ? JSON.parse(r.tags) : [];
      } catch {
        return [];
      }
    })(),
    deleted: Number(r.deleted ?? 0) === 1,
    cloudId: r.cloud_id ?? undefined,
    totals: {
      kcal: Number(r.totals_kcal ?? 0),
      protein: Number(r.totals_protein ?? 0),
      carbs: Number(r.totals_carbs ?? 0),
      fat: Number(r.totals_fat ?? 0),
    },
  };
}

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
  return (rows as MealRow[]).map(rowToMeal);
}

export type LocalHistoryFilters = {
  calories?: [number, number];
  protein?: [number, number];
  carbs?: [number, number];
  fat?: [number, number];
  dateRange?: { start: Date; end: Date };
};

export async function getMealsPageLocalFiltered(
  uid: string,
  opts: {
    limit: number;
    beforeISO?: string | null;
    filters?: LocalHistoryFilters;
  }
): Promise<{ items: Meal[]; nextBefore: string | null }> {
  const db = getDB();
  const args: any[] = [uid];

  const where: string[] = [`user_uid=?`, `deleted=0`];

  if (opts.beforeISO) {
    where.push(`timestamp<?`);
    args.push(opts.beforeISO);
  }

  if (opts.filters?.dateRange) {
    where.push(`timestamp>=?`);
    where.push(`timestamp<=?`);
    const s = new Date(opts.filters.dateRange.start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(opts.filters.dateRange.end);
    e.setHours(23, 59, 59, 999);
    args.push(s.toISOString(), e.toISOString());
  }

  const pushBetween = (col: string, rng?: [number, number]) => {
    if (!rng) return;
    where.push(`${col}>=?`);
    where.push(`${col}<=?`);
    args.push(rng[0], rng[1]);
  };
  pushBetween("totals_kcal", opts.filters?.calories);
  pushBetween("totals_protein", opts.filters?.protein);
  pushBetween("totals_carbs", opts.filters?.carbs);
  pushBetween("totals_fat", opts.filters?.fat);

  const sql = `
    SELECT * FROM meals
    WHERE ${where.join(" AND ")}
    ORDER BY timestamp DESC
    LIMIT ?
  `;
  args.push(opts.limit);

  const rows = db.getAllSync(sql, args) as MealRow[];
  const items = rows.map(rowToMeal);
  const nextBefore =
    items.length === opts.limit
      ? String(items[items.length - 1].timestamp)
      : null;

  return { items, nextBefore };
}

export async function markDeletedLocal(
  cloudId: string,
  updatedAt: string
): Promise<void> {
  const db = getDB();
  db.runSync(`UPDATE meals SET deleted=1, updated_at=? WHERE cloud_id=?`, [
    updatedAt,
    cloudId,
  ]);
  emit("meal:local:deleted", { cloudId, ts: updatedAt });
}
