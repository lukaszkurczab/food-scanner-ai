import { useState, useCallback, useRef } from "react";
import { database } from "@/src/db/database";
import ChatMessageModel from "@/src/db/models/ChatMessage";
import type { ChatMessage, ChatSyncStatus } from "@/src/types";
import {
  fetchChatMessagesFromFirestore,
  updateChatMessageInFirestore,
  addChatMessageToFirestore,
  deleteChatMessageInFirestore,
} from "@/src/services/firestore/firestoreChatService";

const mapModelToChatMessage = (m: ChatMessageModel): ChatMessage => ({
  id: m.id,
  userUid: m.userUid,
  role: m.role as "user" | "assistant" | "system",
  content: m.content,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
  syncStatus: m.syncState as ChatSyncStatus,
  cloudId: m.cloudId,
  deleted: m.deleted,
});

function areMessagesEqual(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].updatedAt !== b[i].updatedAt) return false;
  }
  return true;
}

export function useChatHistory(userUid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<ChatSyncStatus>("pending");
  const syncingRef = useRef(false);

  const getChatHistory = useCallback(async () => {
    const chatCollection = database.get<ChatMessageModel>("chat_messages");
    const localMessages = await chatCollection.query().fetch();
    const filtered = localMessages
      .filter((m) => m.userUid === userUid && !m.deleted)
      .map(mapModelToChatMessage);

    setMessages((prev) => (areMessagesEqual(prev, filtered) ? prev : filtered));
    setLoading(false);
  }, [userUid]);

  const addChatMessage = useCallback(
    async (msg: Omit<ChatMessage, "id" | "syncStatus" | "deleted">) => {
      const chatCollection = database.get<ChatMessageModel>("chat_messages");
      const now = Date.now();
      await database.write(async () => {
        await chatCollection.create((m) => {
          m.userUid = msg.userUid;
          m.role = msg.role;
          m.content = msg.content;
          m.createdAt = now;
          m.updatedAt = now;
          m.syncState = "pending";
          m.deleted = false;
        });
      });
      await getChatHistory();
      setSyncStatus("pending");
    },
    [getChatHistory]
  );

  const deleteChatMessage = useCallback(
    async (id: string) => {
      const chatCollection = database.get<ChatMessageModel>("chat_messages");
      const localMsg = (await chatCollection.find(id)) as ChatMessageModel;
      if (localMsg) {
        await database.write(async () => {
          await localMsg.update((m) => {
            m.deleted = true;
            m.syncState = "pending";
          });
        });
        await getChatHistory();
        setSyncStatus("pending");
      }
    },
    [getChatHistory]
  );

  const syncChatHistory = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const chatCollection = database.get<ChatMessageModel>("chat_messages");
      const localMessages = await chatCollection.query().fetch();
      const unsynced = localMessages.filter((m) => m.syncState !== "synced");
      const remoteMessages = await fetchChatMessagesFromFirestore(userUid);

      for (const remote of remoteMessages) {
        const local = localMessages.find(
          (m) =>
            m.cloudId === remote.cloudId || m.createdAt === remote.createdAt
        );
        if (!local) {
          await database.write(async () => {
            await chatCollection.create((m) => {
              m.userUid = remote.userUid;
              m.role = remote.role as any;
              m.content = remote.content;
              m.createdAt = remote.createdAt;
              m.updatedAt = remote.updatedAt;
              m.syncState = remote.syncStatus as any;
              m.cloudId = remote.cloudId;
              m.deleted = remote.deleted;
            });
          });
        } else if (remote.updatedAt > local.updatedAt) {
          await database.write(async () => {
            await local.update((m) => {
              m.role = remote.role as any;
              m.content = remote.content;
              m.updatedAt = remote.updatedAt;
              m.syncState = remote.syncStatus as any;
              m.cloudId = remote.cloudId;
              m.deleted = remote.deleted;
            });
          });
        }
      }

      for (const local of unsynced) {
        if (local.deleted) {
          await deleteChatMessageInFirestore(local.id);
        } else if (!local.cloudId) {
          await addChatMessageToFirestore(mapModelToChatMessage(local));
        } else {
          await updateChatMessageInFirestore(
            local.cloudId,
            mapModelToChatMessage(local)
          );
        }
        await database.write(async () => {
          await local.update((m) => {
            m.syncState = "synced";
          });
        });
      }
      setSyncStatus("synced");
    } finally {
      syncingRef.current = false;
    }
  }, [userUid]);

  return {
    messages,
    loading,
    syncStatus,
    getChatHistory,
    addChatMessage,
    deleteChatMessage,
    syncChatHistory,
  };
}
