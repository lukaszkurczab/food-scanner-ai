import type { FormData } from "./onboarding";

export type UserPlan = "free" | "premium";
export type SyncStatus = "synced" | "pending" | "conflict";

export interface UserData {
  uid: string;
  email: string;
  username: string;
  plan: UserPlan;
  firstLogin: boolean;
  createdAt: number;
  lastLogin: string;
  nutritionSurvey: FormData;
  onboardingVersion?: number;
  syncStatus: SyncStatus;
  updatedAt: number;
  lastSyncedAt?: string;
  avatarUrl?: string;
  avatarLocalPath?: string;
  avatarUpdatedAt?: number;
}
