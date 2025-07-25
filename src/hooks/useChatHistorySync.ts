import { useState, useCallback, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
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

export function useChatHistory(userUid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<ChatSyncStatus>("pending");

  const getChatHistory = useCallback(async () => {
    setLoading(true);
    const chatCollection = database.get<ChatMessageModel>("chat_messages");
    const localMessages = await chatCollection.query().fetch();
    setMessages(
      localMessages
        .filter((m) => m.userUid === userUid && !m.deleted)
        .map(mapModelToChatMessage)
    );
    setLoading(false);
  }, [userUid]);

  const addChatMessage = useCallback(
    async (msg: Omit<ChatMessage, "id" | "syncStatus" | "deleted">) => {
      const chatCollection = database.get<ChatMessageModel>("chat_messages");
      const now = new Date().toISOString();
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
      getChatHistory();
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
        getChatHistory();
        setSyncStatus("pending");
      }
    },
    [getChatHistory]
  );

  const syncChatHistory = useCallback(async () => {
    const chatCollection = database.get<ChatMessageModel>("chat_messages");
    const localMessages = await chatCollection.query().fetch();
    const unsynced = localMessages.filter((m) => m.syncState !== "synced");

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    const remoteMessages = await fetchChatMessagesFromFirestore(userUid);

    for (const remote of remoteMessages) {
      const local = localMessages.find(
        (m) => m.cloudId === remote.cloudId || m.createdAt === remote.createdAt
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
    getChatHistory();
  }, [userUid, getChatHistory]);

  useEffect(() => {
    getChatHistory();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncChatHistory();
    });
    return unsubscribe;
  }, [getChatHistory, syncChatHistory]);

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
