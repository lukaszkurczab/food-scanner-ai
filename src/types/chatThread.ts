export type ChatThread = {
  id: string;
  userUid: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
  lastMessageAt?: number;
};
