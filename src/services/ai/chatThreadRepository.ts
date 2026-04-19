import NetInfo from "@react-native-community/netinfo";
import type { ChatMessage, ChatThread } from "@/types";
import { get, post } from "@/services/core/apiClient";
import { captureException } from "@/services/core/errorLogger";
import { on } from "@/services/core/events";
import { isOfflineNetState } from "@/services/core/networkState";
import {
  getChatMessagesPageLocal,
  getChatThreadsLocal,
  setChatMessageSyncState,
  upsertChatMessageLocal,
  upsertChatThreadLocal,
} from "@/services/offline/chat.repo";
import { enqueueChatMessagePersist } from "@/services/offline/queue.repo";
import { pullChatChanges } from "@/services/offline/sync.engine";

type ChatMessageApiItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  lastSyncedAt: number;
  deleted?: boolean;
};

type ChatMessagesPageApiResponse = {
  items: ChatMessageApiItem[];
  nextBeforeCreatedAt: number | null;
};

export type ChatMessageCursor = {
  beforeCreatedAt: number;
} | null;

export type ChatMessagesPage = {
  items: ChatMessage[];
  nextCursor: ChatMessageCursor;
};

const LOCAL_THREADS_LIMIT = 20;
const chatPullInFlight = new Map<string, Promise<void>>();

function requestChatPull(userUid: string): Promise<void> {
  const existing = chatPullInFlight.get(userUid);
  if (existing) return existing;
  const task = pullChatChanges(userUid).finally(() => {
    chatPullInFlight.delete(userUid);
  });
  chatPullInFlight.set(userUid, task);
  return task;
}

function toChatMessage(userUid: string, item: ChatMessageApiItem): ChatMessage {
  return {
    id: item.id,
    userUid,
    role: item.role,
    content: item.content,
    createdAt: Number(item.createdAt || 0),
    lastSyncedAt: Number(item.lastSyncedAt || item.createdAt || 0),
    syncState: "synced",
    deleted: !!item.deleted,
    cloudId: item.id,
  };
}

async function syncMessagesFromBackend(params: {
  userUid: string;
  threadId: string;
  limitCount: number;
  beforeCreatedAt?: number | null;
}): Promise<void> {
  const search = new URLSearchParams({
    limit: String(params.limitCount),
  });
  if (params.beforeCreatedAt != null) {
    search.set("beforeCreatedAt", String(params.beforeCreatedAt));
  }

  const response = await get<ChatMessagesPageApiResponse>(
    `/users/me/chat/threads/${params.threadId}/messages?${search.toString()}`,
  );

  for (const item of response.items) {
    const message = toChatMessage(params.userUid, item);
    await upsertChatMessageLocal({ threadId: params.threadId, message });
  }
}

export function subscribeToChatThreadMessages(params: {
  userUid: string;
  threadId: string;
  pageSize: number;
  onMessages: (items: ChatMessage[], nextCursor: ChatMessageCursor) => void;
  onError?: (error: unknown) => void;
}): () => void {
  let active = true;

  const publish = async () => {
    const page = await getChatMessagesPageLocal({
      userUid: params.userUid,
      threadId: params.threadId,
      limitCount: params.pageSize,
    });
    if (!active) return;
    params.onMessages(
      page.items,
      page.nextBeforeCreatedAt == null
        ? null
        : { beforeCreatedAt: page.nextBeforeCreatedAt },
    );
  };

  void publish();

  const off = on(`chat:messages:${params.userUid}:${params.threadId}`, () => {
    void publish();
  });

  void (async () => {
    try {
      const net = await NetInfo.fetch();
      if (isOfflineNetState(net)) return;
      await requestChatPull(params.userUid);
      await publish();
    } catch (error) {
      params.onError?.(error);
    }
  })();

  return () => {
    active = false;
    off();
  };
}

export async function fetchChatThreadMessagesPage(params: {
  userUid: string;
  threadId: string;
  pageSize: number;
  cursor: ChatMessageCursor;
}): Promise<ChatMessagesPage> {
  let page = await getChatMessagesPageLocal({
    userUid: params.userUid,
    threadId: params.threadId,
    limitCount: params.pageSize,
    beforeCreatedAt: params.cursor?.beforeCreatedAt ?? null,
  });

  if (page.items.length < params.pageSize) {
    try {
      const net = await NetInfo.fetch();
      if (!isOfflineNetState(net)) {
        await syncMessagesFromBackend({
          userUid: params.userUid,
          threadId: params.threadId,
          limitCount: params.pageSize,
          beforeCreatedAt: params.cursor?.beforeCreatedAt ?? null,
        });
        page = await getChatMessagesPageLocal({
          userUid: params.userUid,
          threadId: params.threadId,
          limitCount: params.pageSize,
          beforeCreatedAt: params.cursor?.beforeCreatedAt ?? null,
        });
      }
    } catch (error) {
      captureException(
        "[chatThreadRepository] failed to sync older chat messages",
        {
          userUid: params.userUid,
          threadId: params.threadId,
          beforeCreatedAt: params.cursor?.beforeCreatedAt ?? null,
        },
        error,
      );
    }
  }

  return {
    items: page.items,
    nextCursor:
      page.nextBeforeCreatedAt == null
        ? null
        : { beforeCreatedAt: page.nextBeforeCreatedAt },
  };
}

export async function persistUserChatMessage(params: {
  userUid: string;
  threadId: string;
  messageId: string;
  content: string;
  createdAt: number;
  title?: string;
  syncToBackend?: boolean;
}): Promise<void> {
  const syncToBackend = params.syncToBackend !== false;
  const thread: ChatThread = {
    id: params.threadId,
    userUid: params.userUid,
    title: params.title || "",
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    lastMessage: params.content,
    lastMessageAt: params.createdAt,
  };
  const message: ChatMessage = {
    id: params.messageId,
    userUid: params.userUid,
    role: "user",
    content: params.content,
    createdAt: params.createdAt,
    lastSyncedAt: params.createdAt,
    syncState: syncToBackend ? "pending" : "synced",
    deleted: false,
    cloudId: params.messageId,
  };

  await upsertChatThreadLocal(thread);
  await upsertChatMessageLocal({ threadId: params.threadId, message });
  if (!syncToBackend) return;

  try {
    const net = await NetInfo.fetch();
    if (isOfflineNetState(net)) {
      await enqueueChatMessagePersist(params.userUid, {
        threadId: params.threadId,
        messageId: params.messageId,
        role: "user",
        content: params.content,
        createdAt: params.createdAt,
        title: params.title,
      });
      return;
    }
    await post(
      `/users/me/chat/threads/${params.threadId}/messages`,
      {
        messageId: params.messageId,
        role: "user",
        content: params.content,
        createdAt: params.createdAt,
        title: params.title,
      },
      {
        retryMode: "idempotent",
      },
    );
    await setChatMessageSyncState({
      userUid: params.userUid,
      threadId: params.threadId,
      messageId: params.messageId,
      syncState: "synced",
      lastSyncedAt: params.createdAt,
    });
  } catch (error) {
    await enqueueChatMessagePersist(params.userUid, {
      threadId: params.threadId,
      messageId: params.messageId,
      role: "user",
      content: params.content,
      createdAt: params.createdAt,
      title: params.title,
    });
    captureException(
      "[chatThreadRepository] failed to persist user chat message to backend",
      {
        userUid: params.userUid,
        threadId: params.threadId,
        messageId: params.messageId,
      },
      error,
    );
  }
}

export async function persistAssistantChatMessage(params: {
  userUid: string;
  threadId: string;
  messageId: string;
  content: string;
  createdAt: number;
  syncToBackend?: boolean;
}): Promise<void> {
  const syncToBackend = params.syncToBackend !== false;
  const message: ChatMessage = {
    id: params.messageId,
    userUid: params.userUid,
    role: "assistant",
    content: params.content,
    createdAt: params.createdAt,
    lastSyncedAt: params.createdAt,
    syncState: syncToBackend ? "pending" : "synced",
    deleted: false,
    cloudId: params.messageId,
  };
  const thread: ChatThread = {
    id: params.threadId,
    userUid: params.userUid,
    title: "",
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    lastMessage: params.content,
    lastMessageAt: params.createdAt,
  };

  await upsertChatThreadLocal(thread);
  await upsertChatMessageLocal({ threadId: params.threadId, message });
  if (!syncToBackend) return;

  try {
    const net = await NetInfo.fetch();
    if (isOfflineNetState(net)) {
      await enqueueChatMessagePersist(params.userUid, {
        threadId: params.threadId,
        messageId: params.messageId,
        role: "assistant",
        content: params.content,
        createdAt: params.createdAt,
      });
      return;
    }
    await post(
      `/users/me/chat/threads/${params.threadId}/messages`,
      {
        messageId: params.messageId,
        role: "assistant",
        content: params.content,
        createdAt: params.createdAt,
      },
      {
        retryMode: "idempotent",
      },
    );
    await setChatMessageSyncState({
      userUid: params.userUid,
      threadId: params.threadId,
      messageId: params.messageId,
      syncState: "synced",
      lastSyncedAt: params.createdAt,
    });
  } catch (error) {
    await enqueueChatMessagePersist(params.userUid, {
      threadId: params.threadId,
      messageId: params.messageId,
      role: "assistant",
      content: params.content,
      createdAt: params.createdAt,
    });
    captureException(
      "[chatThreadRepository] failed to persist assistant chat message to backend",
      {
        userUid: params.userUid,
        threadId: params.threadId,
        messageId: params.messageId,
      },
      error,
    );
  }
}

export function subscribeToChatThreads(params: {
  userUid: string;
  onThreads: (items: ChatThread[]) => void;
  onError?: (error: unknown) => void;
}): () => void {
  let active = true;

  const publish = async () => {
    const items = await getChatThreadsLocal(params.userUid, LOCAL_THREADS_LIMIT);
    if (!active) return;
    params.onThreads(items);
  };

  void publish();

  const off = on(`chat:threads:${params.userUid}`, () => {
    void publish();
  });

  void (async () => {
    try {
      const net = await NetInfo.fetch();
      if (isOfflineNetState(net)) return;
      await requestChatPull(params.userUid);
      await publish();
    } catch (error) {
      params.onError?.(error);
    }
  })();

  return () => {
    active = false;
    off();
  };
}
