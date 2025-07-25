import type { FormData } from "@/src/types";

export interface Survey {
  id: string;
  userUid: string;
  formData: FormData;
  completedAt: string;
  syncStatus: "synced" | "pending" | "conflict";
}

export function mapRawToSurvey(raw: any): Survey {
  return {
    id: raw.id,
    userUid: raw.user_uid,
    formData:
      typeof raw.form_data === "string"
        ? JSON.parse(raw.form_data)
        : raw.form_data,
    completedAt: raw.completed_at,
    syncStatus: raw.sync_status,
  };
}
