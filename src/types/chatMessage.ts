export type ChatSyncStatus = "synced" | "pending" | "conflict";

export interface ChatMessage {
  id: string;
  userUid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: ChatSyncStatus;
  cloudId?: string;
  deleted?: boolean;
}
