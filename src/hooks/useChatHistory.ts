// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import i18next from "i18next";
import { v4 as uuidv4 } from "uuid";
import type { Meal, FormData, ChatMessage } from "@/types";
import { post } from "@/services/core/apiClient";
import { emit, on } from "@/services/core/events";
import { asString, isRecord } from "@/services/contracts/guards";
import type { AiAskBackendResponse } from "@/services/ai/contracts";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { captureException } from "@/services/core/errorLogger";
import { getAiUxErrorType, type AiUxErrorType } from "@/services/ai/uxError";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import {
  getDeadLetterCount,
  retryDeadLetterOps,
  type QueueKind,
} from "@/services/offline/queue.repo";
import { pushQueue } from "@/services/offline/sync.engine";
import {
  trackAiChatResult,
  trackAiChatSend,
} from "@/services/telemetry/telemetryInstrumentation";
import {
  type ChatMessageCursor,
  fetchChatThreadMessagesPage,
  persistAssistantChatMessage,
  persistUserChatMessage,
  subscribeToChatThreadMessages,
} from "@/services/ai/chatThreadRepository";

type Options = { pageSize?: number };
type AiHistoryItem = {
  from: "user" | "ai";
  text: string;
};

const GATEWAY_REJECT_REASONS = new Set(["OFF_TOPIC", "ML_OFF_TOPIC", "TOO_SHORT"]);
const CHAT_DEAD_LETTER_KINDS: QueueKind[] = ["persist_chat_message"];

function buildAiContext(
  meals: Meal[],
  profile: FormData,
  history: AiHistoryItem[],
) {
  return {
    meals: meals.slice(0, 5),
    profile,
    history,
    language: i18next.language || "en",
    actionType: "chat",
  };
}

function findInsertIndexDesc(messages: ChatMessage[], createdAt: number): number {
  let left = 0;
  let right = messages.length;

  while (left < right) {
    const mid = (left + right) >> 1;
    if (messages[mid].createdAt >= createdAt) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

function upsertSortedMessage(
  messages: ChatMessage[],
  next: ChatMessage,
): ChatMessage[] {
  const existingIndex = messages.findIndex((m) => m.id === next.id);

  if (existingIndex >= 0) {
    const existing = messages[existingIndex];
    if (existing.createdAt === next.createdAt) {
      const updated = [...messages];
      updated[existingIndex] = next;
      return updated;
    }

    const withoutExisting = [
      ...messages.slice(0, existingIndex),
      ...messages.slice(existingIndex + 1),
    ];
    const insertIndex = findInsertIndexDesc(withoutExisting, next.createdAt);
    return [
      ...withoutExisting.slice(0, insertIndex),
      next,
      ...withoutExisting.slice(insertIndex),
    ];
  }

  const insertIndex = findInsertIndexDesc(messages, next.createdAt);
  return [
    ...messages.slice(0, insertIndex),
    next,
    ...messages.slice(insertIndex),
  ];
}

function upsertSortedMessages(
  messages: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  return incoming.reduce(
    (acc: ChatMessage[], message: ChatMessage) =>
      upsertSortedMessage(acc, message),
    messages,
  );
}

function getGatewayRejectReason(error: unknown): string | null {
  if (getErrorStatus(error) !== 400 || !isRecord(error)) return null;
  const details = isRecord(error.details) ? error.details : null;
  if (!details) return null;
  return (
    asString(details.reason) ||
    (isRecord(details.detail) ? asString(details.detail.reason) : undefined) ||
    null
  );
}

export function useChatHistory(
  userUid: string,
  meals: Meal[],
  profile: FormData,
  threadId: string,
  opts: Options = {},
) {
  const {
    credits,
    loading: creditsLoading,
    canAfford,
    applyCreditsFromResponse,
    refreshCredits,
  } = useAiCreditsContext();
  const pageSize = opts.pageSize ?? 50;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sendErrorType, setSendErrorType] = useState<AiUxErrorType | null>(null);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [retryingFailedSync, setRetryingFailedSync] = useState(false);

  const lastDocRef = useRef<ChatMessageCursor>(null);

  const isLocalThread = threadId.startsWith("local-");
  const canReadThread = !!userUid && !!threadId && !isLocalThread;
  const usageLoading = !!userUid && creditsLoading;
  const creditAllocation = credits?.allocation ?? 0;
  const creditBalance = credits?.balance ?? 0;
  const creditsUsed = Math.max(creditAllocation - creditBalance, 0);
  const canSend = canAfford("chat");
  const loading = messagesLoading;

  const refreshFailedSyncCount = useCallback(async () => {
    if (!userUid) {
      setFailedSyncCount(0);
      return;
    }
    try {
      const count = await getDeadLetterCount(userUid, {
        kinds: CHAT_DEAD_LETTER_KINDS,
      });
      setFailedSyncCount(count);
    } catch {
      // Ignore dead-letter lookup failures; chat can still function.
    }
  }, [userUid]);

  useEffect(() => {
    void refreshFailedSyncCount();
  }, [refreshFailedSyncCount]);

  useEffect(() => {
    if (!userUid) return;
    const refreshForUid = (event?: { uid?: string }) => {
      const eventUid = typeof event?.uid === "string" ? event.uid : userUid;
      if (eventUid !== userUid) return;
      void refreshFailedSyncCount();
    };
    const unsubs = [
      on<{ uid?: string }>("sync:op:dead", refreshForUid),
      on<{ uid?: string }>("sync:op:retried", refreshForUid),
      on<{ uid?: string }>("chat:failed", refreshForUid),
      on<{ uid?: string }>("chat:pushed", refreshForUid),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [userUid, refreshFailedSyncCount]);

  useEffect(() => {
    if (!canReadThread) {
      setMessages([]);
      setMessagesLoading(false);
      lastDocRef.current = null;
      setHasMore(false);
      return;
    }

    const unsub = subscribeToChatThreadMessages({
      userUid,
      threadId,
      pageSize,
      onMessages: (items, nextCursor) => {
        setMessages(items);
        lastDocRef.current = nextCursor;
        setHasMore(!!nextCursor);
        setMessagesLoading(false);
      },
      onError: () => {
        setMessagesLoading(false);
      },
    });

    return unsub;
  }, [canReadThread, pageSize, threadId, userUid]);

  const loadMore = useCallback(async () => {
    if (!canReadThread || !hasMore || !lastDocRef.current) return;

    const page = await fetchChatThreadMessagesPage({
      userUid,
      threadId,
      pageSize,
      cursor: lastDocRef.current,
    });

    setMessages((prev) => upsertSortedMessages(prev, page.items));

    lastDocRef.current = page.nextCursor;
    setHasMore(!!page.nextCursor);
  }, [canReadThread, hasMore, pageSize, threadId, userUid]);

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed || !canSend || sending) return null;

      const net = await NetInfo.fetch();
      if (!net.isConnected) return null;
      if (!userUid) return null;
      void trackAiChatSend(trimmed);

      setSending(true);
      setTyping(true);
      setSendErrorType(null);

      const now = Date.now();
      const createdThreadId = isLocalThread ? uuidv4() : threadId;
      const userMsgId = uuidv4();
      const aiMsgId = uuidv4();

      const optimisticUser: ChatMessage = {
        id: userMsgId,
        userUid,
        role: "user",
        content: trimmed,
        createdAt: now,
        lastSyncedAt: now,
        syncState: "synced",
        deleted: false,
        cloudId: userMsgId,
      };

      setMessages((prev) => upsertSortedMessage(prev, optimisticUser));

      await persistUserChatMessage({
        userUid,
        threadId: createdThreadId,
        messageId: userMsgId,
        content: trimmed,
        createdAt: now,
        title: isLocalThread
          ? trimmed.length > 42
            ? trimmed.slice(0, 42).trim() + "…"
            : trimmed
          : undefined,
      });

      let aiText = "";
      let askFailed = false;
      try {
        const historyForAi: AiHistoryItem[] = messages.slice(0, 10).map((m) => ({
          from: m.role === "user" ? "user" : "ai",
          text: m.content,
        }));
        const aiResponse = await post<AiAskBackendResponse>("/ai/ask", {
          message: trimmed,
          context: buildAiContext(meals, profile, [
            ...historyForAi,
            { from: "user", text: trimmed },
          ]),
        });
        aiText = aiResponse.reply?.trim()
          ? aiResponse.reply
          : i18next.t(
              "chat:errors.emptyResponse",
              "I couldn't generate a useful response. Please try again.",
            );
        void trackAiChatResult("success");
        if (!aiResponse.reply?.trim()) {
          setSendErrorType("unknown");
        }
        applyCreditsFromResponse(aiResponse);
      } catch (error) {
        const status = getErrorStatus(error);
        const gatewayReason = getGatewayRejectReason(error);
        const errorType = getAiUxErrorType(error);
        if (status === 402) {
          const refreshed = await refreshCredits();
          const refreshedLimit = refreshed?.allocation ?? creditAllocation;
          const refreshedUsed = refreshed
            ? Math.max(refreshedLimit - refreshed.balance, 0)
            : creditsUsed;
          aiText = i18next.t(
            "limit.reachedShort",
            {
              ns: "chat",
              used: refreshedUsed,
              limit: refreshedLimit,
            },
          );
          void trackAiChatResult("payment_required");
          setSendErrorType(null);
        } else if (
          gatewayReason !== null &&
          GATEWAY_REJECT_REASONS.has(gatewayReason)
        ) {
          aiText = i18next.t(
            "chat:errors.offTopic",
            "Moge odpowiadac tylko na pytania o zywienie i diete.",
          );
          void trackAiChatResult("gateway_reject");
          setSendErrorType(null);
        } else if (status === 429) {
          aiText = i18next.t(
            "chat:errors.rateLimited",
            "You're sending messages too quickly. Please wait a moment.",
          );
          void trackAiChatResult("rate_limited");
          setSendErrorType(null);
        } else if (errorType === "offline") {
          aiText = i18next.t(
            "chat:errors.offline",
            "You're offline. Reconnect and try again.",
          );
          void trackAiChatResult("offline");
          setSendErrorType("offline");
        } else if (errorType === "timeout") {
          aiText = i18next.t(
            "chat:errors.timeout",
            "The request timed out. Please retry.",
          );
          void trackAiChatResult("timeout");
          setSendErrorType("timeout");
        } else if (errorType === "unavailable") {
          aiText = i18next.t(
            "chat:errors.serviceUnavailable",
            "AI is temporarily unavailable. Please try again shortly.",
          );
          void trackAiChatResult("unavailable");
          setSendErrorType("unavailable");
        } else if (errorType === "auth") {
          aiText = i18next.t(
            "chat:errors.authRequired",
            "Please sign in again to continue.",
          );
          void trackAiChatResult("auth");
          setSendErrorType("auth");
        } else {
          aiText = i18next.t(
            "chat:errors.fetchFailed",
            "Could not fetch a response. Please try again.",
          );
          void trackAiChatResult("error");
          setSendErrorType("unknown");
        }
        captureException(
          "[useChatHistory.send] failed to send AI chat message",
          { userUid, threadId, message: trimmed },
          error,
        );
        askFailed = true;
        setTyping(false);
        setSending(false);
      }

      const now2 = Date.now();

      const optimisticAi: ChatMessage = {
        id: aiMsgId,
        userUid,
        role: "assistant",
        content: aiText,
        createdAt: now2,
        lastSyncedAt: now2,
        syncState: "synced",
        deleted: false,
        cloudId: aiMsgId,
      };

      setMessages((prev) => upsertSortedMessage(prev, optimisticAi));

      await persistAssistantChatMessage({
        userUid,
        threadId: createdThreadId,
        messageId: aiMsgId,
        content: aiText,
        createdAt: now2,
      });

      if (!askFailed) {
        setTyping(false);
        setSending(false);
      }

      if (isLocalThread) return createdThreadId;
      return null;
    },
    [
      canSend,
      sending,
      isLocalThread,
      threadId,
      userUid,
      meals,
      profile,
      messages,
      creditAllocation,
      creditsUsed,
      applyCreditsFromResponse,
      refreshCredits,
    ],
  );

  const retryFailedSyncOps = useCallback(async () => {
    if (!userUid || retryingFailedSync) return;
    setRetryingFailedSync(true);
    try {
      const retried = await retryDeadLetterOps({
        uid: userUid,
        kinds: CHAT_DEAD_LETTER_KINDS,
      });
      await refreshFailedSyncCount();
      if (retried > 0) {
        emit("ui:toast", {
          key: "deadLetterRetryQueued",
          ns: "chat",
          options: { count: retried },
        });
      }
      const net = await NetInfo.fetch();
      if (retried > 0 && net.isConnected) {
        await pushQueue(userUid);
        await refreshFailedSyncCount();
      }
    } catch {
      emit("ui:toast", {
        text: i18next.t("common:unknownError"),
      });
    } finally {
      setRetryingFailedSync(false);
    }
  }, [refreshFailedSyncCount, retryingFailedSync, userUid]);

  return {
    messages,
    loading,
    usageLoading,
    sending,
    typing,
    canSend,
    creditsUsed,
    creditAllocation,
    creditBalance,
    sendErrorType,
    failedSyncCount,
    retryingFailedSync,
    loadMore,
    send,
    retryFailedSyncOps,
  };
}
