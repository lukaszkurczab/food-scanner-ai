export type ChatSyncState = "synced" | "pending" | "conflict";

export interface ChatMessage {
  id: string;
  userUid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  lastSyncedAt: number;
  syncState: ChatSyncState;
  cloudId?: string;
  deleted?: boolean;
}
