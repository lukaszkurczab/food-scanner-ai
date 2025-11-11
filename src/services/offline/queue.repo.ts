import { getDB } from "./db";
import type { Meal } from "@/types/meal";
import type { QueueRow } from "./types";
import { v4 as uuidv4 } from "uuid";

export type { QueueKind } from "./types";

export type QueuedOp = Omit<QueueRow, "payload"> & { payload: unknown };

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

export async function enqueueUpsert(uid: string, meal: Meal): Promise<void> {
  const db = getDB();
  const cloudId = meal.cloudId ?? meal.mealId;
  const payload = meal.cloudId ? meal : { ...meal, cloudId };
  db.runSync(
    `INSERT INTO op_queue (cloud_id, user_uid, kind, payload, updated_at)
     VALUES (?, ?, 'upsert', ?, ?)`,
    [cloudId, uid, JSON.stringify(payload), meal.updatedAt]
  );
}

export async function enqueueMyMealUpsert(
  uid: string,
  meal: Meal
): Promise<void> {
  const db = getDB();
  const docId = meal.mealId ?? meal.cloudId ?? uuidv4();
  const payload = {
    ...meal,
    mealId: docId,
    cloudId: docId,
    source: meal.source ?? "saved",
  };
  db.runSync(
    `INSERT INTO op_queue (cloud_id, user_uid, kind, payload, updated_at)
     VALUES (?, ?, 'upsert_mymeal', ?, ?)`,
    [docId, uid, JSON.stringify(payload), meal.updatedAt]
  );
}

export async function enqueueDelete(
  uid: string,
  cloudId: string,
  updatedAt: string
): Promise<void> {
  const db = getDB();
  db.runSync(
    `INSERT INTO op_queue (cloud_id, user_uid, kind, payload, updated_at)
     VALUES (?, ?, 'delete', ?, ?)`,
    [cloudId, uid, JSON.stringify({ cloudId, deleted: true }), updatedAt]
  );
}

export async function enqueueMyMealDelete(
  uid: string,
  cloudId: string,
  updatedAt: string
): Promise<void> {
  const db = getDB();
  db.runSync(
    `INSERT INTO op_queue (cloud_id, user_uid, kind, payload, updated_at)
     VALUES (?, ?, 'delete_mymeal', ?, ?)`,
    [cloudId, uid, JSON.stringify({ cloudId, deleted: true }), updatedAt]
  );
}

export async function nextBatch(limit = 20): Promise<QueuedOp[]> {
  const db = getDB();
  const rows = db.getAllSync(`SELECT * FROM op_queue ORDER BY id ASC LIMIT ?`, [
    limit,
  ]);
  return (rows as QueueRow[]).map((r) => ({
    ...r,
    payload: safeParse(r.payload),
  }));
}

export async function markDone(id: number): Promise<void> {
  const db = getDB();
  db.runSync(`DELETE FROM op_queue WHERE id=?`, [id]);
}

export async function bumpAttempts(id: number): Promise<void> {
  const db = getDB();
  db.runSync(`UPDATE op_queue SET attempts=attempts+1 WHERE id=?`, [id]);
}
