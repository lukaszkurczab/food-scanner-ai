import { getDB } from "./db";
import type { Meal } from "@/types/meal";
import type { MealRow } from "./types";
import { emit } from "@/services/core/events";
import type { SQLiteBindValue } from "expo-sqlite";
import {
  normalizeMealInputMethod,
  parseMealAiMeta,
  serializeMealAiMeta,
} from "@/services/meals/mealMetadata";

function toEpochMs(value?: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeMealSyncState(value: Meal["syncState"]): Meal["syncState"] {
  if (value === "synced") return "synced";
  if (value === "failed") return "failed";
  if (value === "conflict") return "conflict";
  return "pending";
}

function toDayKey(value?: string | null): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function upsertMealLocal(meal: Meal): Promise<void> {
  const db = getDB();
  const tags = JSON.stringify(meal.tags || []);
  const ingredients = JSON.stringify(
    Array.isArray(meal.ingredients) ? meal.ingredients : []
  );
  const aiMeta = serializeMealAiMeta(meal.aiMeta);
  const createdAt = meal.createdAt ?? meal.timestamp ?? meal.updatedAt;
  const syncState = normalizeMealSyncState(meal.syncState);
  const lastSyncedAt = syncState === "synced" ? toEpochMs(meal.updatedAt) : 0;

  db.runSync(
    `INSERT INTO meals (
      cloud_id, meal_id, user_uid, timestamp, day_key, logged_at_local_min, tz_offset_min, type, name,
      ingredients,
      photo_url, image_local, image_id,
      totals_kcal, totals_protein, totals_carbs, totals_fat,
      deleted, created_at, updated_at, last_synced_at, sync_state, source, input_method, ai_meta, notes, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cloud_id) DO UPDATE SET
      meal_id=excluded.meal_id,
      timestamp=excluded.timestamp,
      day_key=excluded.day_key,
      logged_at_local_min=excluded.logged_at_local_min,
      tz_offset_min=excluded.tz_offset_min,
      type=excluded.type,
      name=excluded.name,
      ingredients=excluded.ingredients,
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
      last_synced_at=CASE
        WHEN excluded.sync_state='synced' THEN excluded.last_synced_at
        ELSE meals.last_synced_at
      END,
      sync_state=excluded.sync_state,
      source=excluded.source,
      input_method=excluded.input_method,
      ai_meta=excluded.ai_meta,
      notes=excluded.notes,
      tags=excluded.tags`,
    [
      meal.cloudId ?? meal.mealId,
      meal.mealId,
      meal.userUid,
      meal.timestamp,
      toDayKey(meal.dayKey ?? meal.timestamp),
      meal.loggedAtLocalMin ?? null,
      meal.tzOffsetMin ?? null,
      meal.type,
      meal.name,
      ingredients,
      meal.photoUrl ?? null,
      meal.photoLocalPath || null,
      meal.imageId ?? null,
      meal.totals?.kcal ?? 0,
      meal.totals?.protein ?? 0,
      meal.totals?.carbs ?? 0,
      meal.totals?.fat ?? 0,
      meal.deleted ? 1 : 0,
      createdAt,
      meal.updatedAt,
      lastSyncedAt,
      syncState,
      meal.source ?? null,
      normalizeMealInputMethod(meal.inputMethod),
      aiMeta,
      meal.notes ?? null,
      tags,
    ]
  );
  emit("meal:local:upserted", { cloudId: meal.cloudId, ts: meal.updatedAt });
}

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
  return null;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function parseIngredients(raw: string | null): Meal["ingredients"] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Meal["ingredients"]) : [];
  } catch {
    return [];
  }
}

function parseMealSyncState(raw: string | null | undefined): Meal["syncState"] {
  if (
    raw === "synced" ||
    raw === "pending" ||
    raw === "conflict" ||
    raw === "failed"
  ) {
    return raw;
  }
  return "pending";
}

function rowToMeal(r: MealRow): Meal {
  return {
    userUid: r.user_uid,
    mealId: r.meal_id,
    timestamp: r.timestamp,
    dayKey: toDayKey(r.day_key ?? r.timestamp),
    loggedAtLocalMin:
      typeof r.logged_at_local_min === "number"
        ? Number(r.logged_at_local_min)
        : null,
    tzOffsetMin:
      typeof r.tz_offset_min === "number" ? Number(r.tz_offset_min) : null,
    type: parseMealType(r.type),
    name: r.name,
    ingredients: parseIngredients(r.ingredients),
    createdAt: r.created_at ?? r.timestamp ?? r.updated_at,
    updatedAt: r.updated_at,
    lastSyncedAt: Number(r.last_synced_at ?? 0),
    syncState: parseMealSyncState(r.sync_state),
    source: parseMealSource(r.source),
    inputMethod: normalizeMealInputMethod(r.input_method),
    aiMeta: parseMealAiMeta(r.ai_meta),
    imageId: r.image_id ?? null,
    photoUrl: r.photo_url ?? null,
    notes: r.notes ?? null,
    tags: parseTags(r.tags),
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
  const args: SQLiteBindValue[] = [uid];

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
  const last = items.length ? items[items.length - 1] : null;
  const lastTs = last
    ? String(last.timestamp || last.updatedAt || last.createdAt || "")
    : null;
  const nextBefore =
    items.length === opts.limit && lastTs && lastTs.length > 0 ? lastTs : null;

  return { items, nextBefore };
}

export async function markDeletedLocal(
  cloudId: string,
  updatedAt: string
): Promise<void> {
  const db = getDB();
  db.runSync(
    `UPDATE meals
     SET deleted=1, updated_at=?, sync_state='pending'
     WHERE cloud_id=?`,
    [updatedAt, cloudId]
  );
  emit("meal:local:deleted", { cloudId, ts: updatedAt });
}

export async function setMealSyncStateLocal(params: {
  uid: string;
  cloudId: string;
  syncState: Meal["syncState"];
  updatedAt?: string;
}): Promise<void> {
  if (!params.uid || !params.cloudId) return;
  const db = getDB();
  const syncState = normalizeMealSyncState(params.syncState);
  if (syncState === "synced") {
    db.runSync(
      `UPDATE meals
       SET sync_state=?, last_synced_at=?
       WHERE user_uid=? AND cloud_id=?`,
      [
        syncState,
        toEpochMs(params.updatedAt ?? new Date().toISOString()),
        params.uid,
        params.cloudId,
      ]
    );
  } else {
    db.runSync(
      `UPDATE meals
       SET sync_state=?
       WHERE user_uid=? AND cloud_id=?`,
      [syncState, params.uid, params.cloudId]
    );
  }
  emit("meal:local:upserted", {
    cloudId: params.cloudId,
    ts: params.updatedAt ?? new Date().toISOString(),
  });
}

export async function getMealByCloudIdLocal(
  uid: string,
  cloudId: string
): Promise<Meal | null> {
  const db = getDB();
  const row = db.getFirstSync(
    `SELECT * FROM meals WHERE user_uid=? AND cloud_id=? LIMIT 1`,
    [uid, cloudId]
  ) as MealRow | undefined;
  return row ? rowToMeal(row) : null;
}

export async function getPendingMealsLocal(uid: string): Promise<Meal[]> {
  const db = getDB();
  const rows = db.getAllSync(
    `SELECT * FROM meals
     WHERE user_uid=? AND sync_state != 'synced' AND deleted=0`,
    [uid]
  ) as MealRow[];
  return rows.map(rowToMeal);
}

export async function getMealsPageLocalByUpdated(
  uid: string,
  limit: number,
  afterISO?: string | null
): Promise<Meal[]> {
  const db = getDB();
  const rows = afterISO
    ? db.getAllSync(
        `SELECT * FROM meals
         WHERE user_uid=? AND deleted=0 AND updated_at>?
         ORDER BY updated_at ASC LIMIT ?`,
        [uid, afterISO, limit]
      )
    : db.getAllSync(
        `SELECT * FROM meals
         WHERE user_uid=? AND deleted=0
         ORDER BY updated_at ASC LIMIT ?`,
        [uid, limit]
      );
  return (rows as MealRow[]).map(rowToMeal);
}
