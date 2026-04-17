import NetInfo from "@react-native-community/netinfo";
import type { ChatMessage, ChatThread } from "@/types";
import { Sync } from "@/utils/debug";
import { get } from "@/services/core/apiClient";
import { isOfflineNetState } from "@/services/core/networkState";
import { normalizeServiceError } from "@/services/contracts/serviceError";
import {
  getChatThreadByIdLocal,
  upsertChatMessageLocal,
  upsertChatThreadLocal,
} from "../chat.repo";
import { getLastChatPullTs, setLastChatPullTs } from "../sync.storage";
import type { QueueOp, SyncStrategy } from "../sync.strategy";

const log = Sync;

const CHAT_THREADS_PAGE_SIZE = 100;

type ChatThreadApiItem = {
  id: string;
  title?: string | null;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string | null;
  lastMessageAt?: number | null;
};

type ChatThreadsPageApiResponse = {
  items?: ChatThreadApiItem[];
  nextBeforeUpdatedAt?: number | null;
  nextCursor?: string | null;
};

type ChatMessageApiItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  lastSyncedAt: number;
  deleted?: boolean;
};

type ChatMessagesPageApiResponse = {
  items?: ChatMessageApiItem[];
};

function toSyncError(error: unknown) {
  return normalizeServiceError(error, {
    code: "sync/unknown",
    source: "SyncEngine",
    retryable: true,
  });
}

function toChatThreadRole(
  value: string | null | undefined,
): "user" | "assistant" | "system" {
  if (value === "user" || value === "assistant" || value === "system") return value;
  return "assistant";
}

function toChatThread(userUid: string, item: ChatThreadApiItem): ChatThread {
  return {
    id: String(item.id || ""),
    userUid,
    title: String(item.title || ""),
    createdAt: Number(item.createdAt || 0),
    updatedAt: Number(item.updatedAt || 0),
    lastMessage: item.lastMessage ? String(item.lastMessage) : undefined,
    lastMessageAt:
      item.lastMessageAt == null ? undefined : Number(item.lastMessageAt),
  };
}

function toChatMessage(userUid: string, item: ChatMessageApiItem): ChatMessage {
  const createdAt = Number(item.createdAt || 0);
  return {
    id: String(item.id || ""),
    userUid,
    role: toChatThreadRole(item.role),
    content: String(item.content || ""),
    createdAt,
    lastSyncedAt: Number(item.lastSyncedAt || createdAt),
    syncState: "synced",
    deleted: Boolean(item.deleted),
    cloudId: String(item.id || ""),
  };
}

async function pullChatThreadMessages(params: {
  uid: string;
  threadId: string;
  limitCount?: number;
}): Promise<number> {
  const limit = Math.max(1, Math.min(params.limitCount ?? 50, 200));
  const response = await get<ChatMessagesPageApiResponse>(
    `/users/me/chat/threads/${encodeURIComponent(params.threadId)}/messages?limit=${limit}`
  );
  const items = Array.isArray(response?.items) ? response.items : [];
  for (const item of items) {
    const normalized = toChatMessage(params.uid, item);
    if (!normalized.id) continue;
    await upsertChatMessageLocal({
      threadId: params.threadId,
      message: normalized,
    });
  }
  return items.length;
}

export const chatStrategy: SyncStrategy = {
  async pull(uid: string): Promise<number> {
    const pullLog = log.child("pull:chat");
    const net = await NetInfo.fetch();
    pullLog.log("start", { uid, isConnected: net.isConnected });
    if (isOfflineNetState(net)) {
      pullLog.log("skip:offline");
      return 0;
    }

    const lastPullTs = await getLastChatPullTs(uid);
    let newestPullTs = lastPullTs;
    let syncedThreads = 0;
    let syncedMessages = 0;
    let beforeUpdatedAtCursor: number | null = null;
    let opaqueCursor: string | null = null;

    try {
      for (;;) {
        const query = [`limit=${CHAT_THREADS_PAGE_SIZE}`];
        if (beforeUpdatedAtCursor != null) {
          query.push(
            `beforeUpdatedAt=${encodeURIComponent(String(beforeUpdatedAtCursor))}`
          );
        }
        if (opaqueCursor) {
          query.push(`cursor=${encodeURIComponent(opaqueCursor)}`);
        }

        const response = await get<ChatThreadsPageApiResponse>(
          `/users/me/chat/threads?${query.join("&")}`
        );
        const items = Array.isArray(response?.items) ? response.items : [];
        pullLog.log("threads:page", { size: items.length, lastPullTs });
        if (!items.length) break;

        for (const item of items) {
          const normalizedThread = toChatThread(uid, item);
          if (!normalizedThread.id) continue;
          newestPullTs = Math.max(newestPullTs, normalizedThread.updatedAt);

          const localThread = await getChatThreadByIdLocal(uid, normalizedThread.id);
          const localIsNewer =
            !!localThread && localThread.updatedAt > normalizedThread.updatedAt;
          if (!localIsNewer) {
            await upsertChatThreadLocal(normalizedThread);
            syncedThreads++;
          }

          const remoteLastMessageAt = normalizedThread.lastMessageAt ?? 0;
          const localLastMessageAt = localThread?.lastMessageAt ?? 0;
          const shouldSyncMessages =
            !localIsNewer &&
            (!localThread ||
              normalizedThread.updatedAt >= localThread.updatedAt ||
              remoteLastMessageAt > localLastMessageAt ||
              normalizedThread.updatedAt >= lastPullTs);

          if (!shouldSyncMessages) continue;

          try {
            syncedMessages += await pullChatThreadMessages({
              uid,
              threadId: normalizedThread.id,
              limitCount: 50,
            });
          } catch (error: unknown) {
            const err = toSyncError(error);
            pullLog.error("thread_messages:fail", {
              threadId: normalizedThread.id,
              code: err.code,
              message: err.message,
              retryable: err.retryable,
            });
          }
        }

        const nextBeforeUpdatedAt =
          typeof response?.nextBeforeUpdatedAt === "number" &&
          Number.isFinite(response.nextBeforeUpdatedAt)
            ? response.nextBeforeUpdatedAt
            : null;
        const nextCursor =
          typeof response?.nextCursor === "string" &&
          response.nextCursor.trim().length > 0
            ? response.nextCursor
            : null;

        if (nextCursor) {
          if (nextCursor === opaqueCursor) break;
          opaqueCursor = nextCursor;
          beforeUpdatedAtCursor = null;
          continue;
        }

        if (nextBeforeUpdatedAt != null) {
          if (nextBeforeUpdatedAt === beforeUpdatedAtCursor) break;
          beforeUpdatedAtCursor = nextBeforeUpdatedAt;
          opaqueCursor = null;
          continue;
        }

        break;
      }

      if (newestPullTs > lastPullTs) {
        await setLastChatPullTs(uid, newestPullTs);
        pullLog.log("set_last_ts", { newestPullTs });
      }
      pullLog.log("done", {
        threads: syncedThreads,
        messages: syncedMessages,
        lastPullTs: newestPullTs,
      });
      return syncedThreads + syncedMessages;
    } catch (error: unknown) {
      const err = toSyncError(error);
      pullLog.error("threads:fail", {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      });
      throw err;
    }
  },

  async handlePushOp(_uid: string, _op: QueueOp): Promise<boolean> {
    return false;
  },
};
