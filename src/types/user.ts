import type { FormData } from "./onboarding";

export type UserPlan = "free" | "premium";
export type SyncState = "synced" | "pending" | "conflict";

export interface UserData extends FormData {
  uid: string;
  email: string;
  username: string;
  plan: UserPlan;
  createdAt: number; // epoch ms
  lastLogin: string; // ISO string (pozostawione jak w schemacie)
  surveyComplited: boolean; // (pisownia zachowana zgodnie ze schematem)
  syncState: SyncState;
  lastSyncedAt?: string; // ISO string
  avatarUrl?: string;
  avatarLocalPath?: string;
  avatarlastSyncedAt?: string;
  darkTheme: boolean;
  language: string;
}

// Eksport (jeśli faktycznie to wykorzystujesz)
export type ExportedUserData = {
  profile: any;
  meals: any[];
  chatMessages: any[];
};
