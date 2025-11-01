import { getDB } from "./db";
import type { ImageRow, ImageStatus } from "./types";

export async function insertOrUpdateImage(
  userUid: string,
  imageId: string,
  localPath: string,
  status: ImageStatus,
  cloudUrl?: string,
  updatedAt?: string
): Promise<void> {
  const db = getDB();
  db.runSync(
    `INSERT INTO images (image_id, user_uid, local_path, status, cloud_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(image_id) DO UPDATE SET
       user_uid=excluded.user_uid,
       local_path=excluded.local_path,
       status=excluded.status,
       cloud_url=excluded.cloud_url,
       updated_at=excluded.updated_at`,
    [
      imageId,
      userUid,
      localPath,
      status,
      cloudUrl ?? null,
      updatedAt ?? new Date().toISOString(),
    ]
  );
}

export async function getPendingUploads(uid: string): Promise<ImageRow[]> {
  const db = getDB();
  const rows = db.getAllSync(
    `SELECT * FROM images WHERE user_uid=? AND status='pending'`,
    [uid]
  );
  return rows as ImageRow[];
}

export async function markUploaded(
  imageId: string,
  cloudUrl: string
): Promise<void> {
  const db = getDB();
  db.runSync(
    `UPDATE images SET status='uploaded', cloud_url=?, updated_at=? WHERE image_id=?`,
    [cloudUrl, new Date().toISOString(), imageId]
  );
}
