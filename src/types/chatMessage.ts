export type ChatSyncStatus = "synced" | "pending" | "conflict";

export interface ChatMessage {
  id: string;
  userUid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: ChatSyncStatus;
  cloudId?: string;
  deleted?: boolean;
}
