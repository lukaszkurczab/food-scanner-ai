import { getDB } from "./db";

export type QueueKind = "upsert" | "delete";
export type QueuedOp = {
  id: number;
  cloud_id: string;
  user_uid: string;
  kind: QueueKind;
  payload: any;
  updated_at: string;
  attempts: number;
};

/**
 * Enqueue an upsert operation.
 */
export async function enqueueUpsert(uid: string, meal: any): Promise<void> {
  const db = getDB();
  db.runSync(
    `INSERT INTO op_queue (cloud_id, user_uid, kind, payload, updated_at)
     VALUES (?, ?, 'upsert', ?, ?)`,
    [meal.cloudId, uid, JSON.stringify(meal), meal.updatedAt]
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
  return rows.map((r: any) => ({
    ...r,
    payload: JSON.parse(r.payload),
  })) as QueuedOp[];
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
