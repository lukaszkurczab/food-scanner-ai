import type { FormData } from "./onboarding";

export type UserPlan = "free" | "premium";
export type SyncState = "synced" | "pending" | "conflict";

export interface UserData extends FormData {
  uid: string;
  email: string;
  username: string;
  plan: UserPlan;
  createdAt: number;
  lastLogin: string;
  surveyComplited: boolean;
  surveyCompletedAt?: string;
  syncState: SyncState;
  lastSyncedAt?: string;
  avatarUrl?: string;
  avatarLocalPath?: string;
  avatarlastSyncedAt?: string;
  darkTheme: boolean;
  language: string;
}

export type ExportedUserData = {
  profile: any;
  meals: any[];
  chatMessages: any[];
};
