import type { FormData } from "./onboarding";

export type UserPlan = "free" | "premium";
export type syncState = "synced" | "pending" | "conflict";

export interface UserData extends FormData {
  uid: string;
  email: string;
  username: string;
  plan: UserPlan;
  createdAt: number;
  lastLogin: string;
  surveyComplited: boolean;
  syncState: syncState;
  lastSyncedAt?: string;
  avatarUrl?: string;
  avatarLocalPath?: string;
  avatarlastSyncedAt?: string;
  darkTheme: boolean;
}

export type ExportedUserData = {
  profile: any;
  meals: any[];
  chatMessages: any[];
};
