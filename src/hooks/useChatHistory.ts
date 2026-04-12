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
import { getErrorStatus, isServiceError } from "@/services/contracts/serviceError";
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

type RetryableSendContext = {
  threadId: string;
  userMessageId: string;
  content: string;
  createdAt: number;
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

function buildRetryableAiHistory(
  messages: ChatMessage[],
  nextUserMessage: string,
  includeCurrentUser: boolean,
): AiHistoryItem[] {
  const history = messages.slice(0, 10).map((message) => ({
    from: message.role === "user" ? "user" : "ai",
    text: message.content,
  }));

  if (!includeCurrentUser) {
    return history;
  }

  return [...history, { from: "user", text: nextUserMessage }];
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
  const sendInFlightRef = useRef(false);
  const activeSendRequestIdRef = useRef<string | null>(null);
  const sendAbortControllerRef = useRef<AbortController | null>(null);
  const retryableSendRef = useRef<RetryableSendContext | null>(null);
  const isMountedRef = useRef(true);

  const isLocalThread = threadId.startsWith("local-");
  const canReadThread = !!userUid && !!threadId && !isLocalThread;
  const usageLoading = !!userUid && creditsLoading;
  const creditAllocation = credits?.allocation ?? 0;
  const creditBalance = credits?.balance ?? 0;
  const creditsUsed = Math.max(creditAllocation - creditBalance, 0);
  const canSend = canAfford("chat");
  const loading = messagesLoading;

  const cancelInFlightSend = useCallback(() => {
    activeSendRequestIdRef.current = null;
    sendInFlightRef.current = false;
    sendAbortControllerRef.current?.abort();
    sendAbortControllerRef.current = null;
    if (!isMountedRef.current) {
      return;
    }
    setTyping(false);
    setSending(false);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeSendRequestIdRef.current = null;
      sendInFlightRef.current = false;
      sendAbortControllerRef.current?.abort();
      sendAbortControllerRef.current = null;
    };
  }, []);

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

  const sendInternal = useCallback(
    async (
      text: string,
      retryContext?: RetryableSendContext | null,
    ): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed || !canSend || sending || sendInFlightRef.current) return null;

      const net = await NetInfo.fetch();
      if (!net.isConnected) return null;
      if (!userUid) return null;
      void trackAiChatSend(trimmed);

      const requestId = uuidv4();
      activeSendRequestIdRef.current = requestId;
      sendInFlightRef.current = true;
      const askAbortController = new AbortController();
      sendAbortControllerRef.current = askAbortController;

      setSending(true);
      setTyping(true);
      setSendErrorType(null);

      const isRetryAttempt = !!retryContext;
      const now = retryContext?.createdAt ?? Date.now();
      const createdThreadId = retryContext?.threadId ?? (isLocalThread ? uuidv4() : threadId);
      const userMsgId = retryContext?.userMessageId ?? uuidv4();
      const aiMsgId = uuidv4();
      const isRequestActive = () => activeSendRequestIdRef.current === requestId;

      if (!isRetryAttempt) {
        retryableSendRef.current = null;
        const optimisticUser: ChatMessage = {
          id: userMsgId,
          userUid,
          role: "user",
          content: trimmed,
          createdAt: now,
          lastSyncedAt: now,
          syncState: "pending",
          deleted: false,
          cloudId: userMsgId,
        };

        setMessages((prev) => upsertSortedMessage(prev, optimisticUser));
      }

      try {
        if (!isRetryAttempt) {
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
        }

        let askFailed = false;
        let assistantReply: string | null = null;
        try {
          if (!isRequestActive()) return null;

          const historyForAi = buildRetryableAiHistory(
            messages,
            trimmed,
            !isRetryAttempt,
          );
          const aiResponse = await post<AiAskBackendResponse>(
            "/ai/ask",
            {
              message: trimmed,
              context: buildAiContext(meals, profile, historyForAi),
            },
            {
              signal: askAbortController.signal,
              retryMode: "idempotent",
            },
          );

          if (!isRequestActive()) return null;

          assistantReply = aiResponse.reply?.trim() ? aiResponse.reply : null;
          if (assistantReply) {
            void trackAiChatResult("success");
          } else {
            void trackAiChatResult("error");
            setSendErrorType("unknown");
          }
          applyCreditsFromResponse(aiResponse);
        } catch (error) {
          if (isServiceError(error) && error.code === "api/aborted") {
            return null;
          }
          if (!isRequestActive()) return null;

          const status = getErrorStatus(error);
          const gatewayReason = getGatewayRejectReason(error);
          const errorType = getAiUxErrorType(error);
          if (status === 402) {
            const refreshed = await refreshCredits();
            const refreshedLimit = refreshed?.allocation ?? creditAllocation;
            const refreshedUsed = refreshed
              ? Math.max(refreshedLimit - refreshed.balance, 0)
              : creditsUsed;
            void refreshedUsed;
            void trackAiChatResult("payment_required");
            setSendErrorType(null);
          } else if (
            gatewayReason !== null &&
            GATEWAY_REJECT_REASONS.has(gatewayReason)
          ) {
            void trackAiChatResult("gateway_reject");
            setSendErrorType(null);
          } else if (status === 429) {
            void trackAiChatResult("rate_limited");
            setSendErrorType(null);
          } else if (errorType === "offline") {
            void trackAiChatResult("offline");
            setSendErrorType("offline");
          } else if (errorType === "timeout") {
            void trackAiChatResult("timeout");
            setSendErrorType("timeout");
          } else if (errorType === "unavailable") {
            void trackAiChatResult("unavailable");
            setSendErrorType("unavailable");
          } else if (errorType === "auth") {
            void trackAiChatResult("auth");
            setSendErrorType("auth");
          } else {
            void trackAiChatResult("error");
            setSendErrorType("unknown");
          }
          captureException(
            "[useChatHistory.send] failed to send AI chat message",
            { userUid, threadId },
            error,
          );
          retryableSendRef.current = {
            threadId: createdThreadId,
            userMessageId: userMsgId,
            content: trimmed,
            createdAt: now,
          };
          askFailed = true;
        }

        if (!assistantReply || askFailed) {
          if (!askFailed) {
            retryableSendRef.current = {
              threadId: createdThreadId,
              userMessageId: userMsgId,
              content: trimmed,
              createdAt: now,
            };
          }
          return isLocalThread && !isRetryAttempt ? createdThreadId : null;
        }
        if (!isRequestActive()) return null;
        retryableSendRef.current = null;

        const now2 = Date.now();

        const optimisticAi: ChatMessage = {
          id: aiMsgId,
          userUid,
          role: "assistant",
          content: assistantReply,
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
          content: assistantReply,
          createdAt: now2,
        });

        if (isLocalThread && !isRetryAttempt) return createdThreadId;
        return null;
      } finally {
        if (
          isMountedRef.current &&
          activeSendRequestIdRef.current === requestId
        ) {
          activeSendRequestIdRef.current = null;
          sendInFlightRef.current = false;
          if (sendAbortControllerRef.current === askAbortController) {
            sendAbortControllerRef.current = null;
          }
          setTyping(false);
          setSending(false);
        }
      }
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

  const send = useCallback(
    async (text: string): Promise<string | null> => sendInternal(text, null),
    [sendInternal],
  );

  const retryLastSend = useCallback(async (): Promise<string | null> => {
    const retryContext = retryableSendRef.current;
    if (!retryContext) return null;
    return sendInternal(retryContext.content, retryContext);
  }, [sendInternal]);

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
    retryLastSend,
    cancelInFlightSend,
    retryFailedSyncOps,
  };
}
