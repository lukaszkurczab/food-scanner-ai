import React, { createContext, useContext } from "react";
import { useAuthContext } from "./AuthContext";
import { useChatHistory } from "@/hooks/useChatHistory";
import type { ChatMessage } from "@/types";

export type ChatContextType = {
  chatMessages: ChatMessage[];
  loadingChat: boolean;
  chatsyncState: "synced" | "pending" | "conflict";
  getChatHistory: () => Promise<void>;
  addChatMessage: (
    msg: Omit<ChatMessage, "id" | "syncState" | "deleted">
  ) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  syncChatHistory: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType>({
  chatMessages: [],
  loadingChat: true,
  chatsyncState: "pending",
  getChatHistory: async () => {},
  addChatMessage: async () => {},
  deleteChatMessage: async () => {},
  syncChatHistory: async () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthContext();
  const uid = user?.uid || "";

  const {
    messages: chatMessages,
    loading: loadingChat,
    syncState: chatsyncState,
    getChatHistory,
    addChatMessage,
    deleteChatMessage,
    syncChatHistory,
  } = useChatHistory(uid);

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        loadingChat,
        chatsyncState,
        getChatHistory,
        addChatMessage,
        deleteChatMessage,
        syncChatHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
