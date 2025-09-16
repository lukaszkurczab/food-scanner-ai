import { getDB } from "./db";
import type { Meal } from "@/types/meal";
import type { QueueRow, QueueKind } from "./types";

export type { QueueKind } from "./types";

export type QueuedOp = Omit<QueueRow, "payload"> & { payload: unknown };

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

/**
 * Enqueue an upsert operation.
 */
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

/**
 * Enqueue a delete operation.
 */
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

/**
 * Get the next batch of queued operations.
 */
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

/**
 * Mark an operation as done (remove from queue).
 */
export async function markDone(id: number): Promise<void> {
  const db = getDB();
  db.runSync(`DELETE FROM op_queue WHERE id=?`, [id]);
}

/**
 * Increase attempts counter for an operation.
 */
export async function bumpAttempts(id: number): Promise<void> {
  const db = getDB();
  db.runSync(`UPDATE op_queue SET attempts=attempts+1 WHERE id=?`, [id]);
}
