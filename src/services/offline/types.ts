export type QueueKind =
  | "upsert"
  | "delete"
  | "upsert_mymeal"
  | "delete_mymeal";

export type MealRow = {
  cloud_id: string | null;
  meal_id: string;
  user_uid: string;
  timestamp: string;
  type: string;
  name: string | null;
  photo_url: string | null;
  image_local: string | null;
  image_id: string | null;
  totals_kcal: number | null;
  totals_protein: number | null;
  totals_carbs: number | null;
  totals_fat: number | null;
  deleted: number;
  created_at: string | null;
  updated_at: string;
  source: string | null;
  notes: string | null;
  tags: string | null;
};

export type ImageStatus = "pending" | "uploaded" | "failed";

export type ImageRow = {
  image_id: string;
  user_uid: string;
  local_path: string;
  cloud_url: string | null;
  status: ImageStatus;
  updated_at: string;
};

export type QueueRow = {
  id: number;
  cloud_id: string;
  user_uid: string;
  kind: QueueKind;
  payload: string;
  updated_at: string;
  attempts: number;
};
