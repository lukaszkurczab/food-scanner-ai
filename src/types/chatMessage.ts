export type ChatSyncState = "synced" | "pending" | "conflict";

export interface ChatMessage {
  id: string; // WatermelonDB id
  userUid: string; // per-user scoping
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // epoch ms
  lastSyncedAt: number; // epoch ms
  syncState: ChatSyncState;
  cloudId?: string;
  deleted?: boolean;
}
