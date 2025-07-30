export type ChatsyncState = "synced" | "pending" | "conflict";

export interface ChatMessage {
  id: string;
  userUid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  lastSyncedAt: number;
  syncState: ChatsyncState;
  cloudId?: string;
  deleted?: boolean;
}
