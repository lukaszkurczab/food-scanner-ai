import type { FormData } from "./onboarding";

export type UserPlan = "free" | "premium";
export type SyncStatus = "synced" | "pending" | "conflict";

export interface UserData extends FormData {
  uid: string;
  email: string;
  username: string;
  plan: UserPlan;
  firstLogin: boolean;
  createdAt: number;
  lastLogin: string;
  surveyComplited: boolean;
  syncState: SyncStatus;
  updatedAt: number;
  lastSyncedAt?: string;
  avatarUrl?: string;
  avatarLocalPath?: string;
  avatarUpdatedAt?: number;
}
