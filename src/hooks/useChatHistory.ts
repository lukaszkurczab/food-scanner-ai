// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import i18next from "i18next";
import { v4 as uuidv4 } from "uuid";
import type { Meal, FormData, ChatMessage } from "@/types";
import { post } from "@/services/core/apiClient";
import { emit, on } from "@/services/core/events";
import { isOfflineNetState } from "@/services/core/networkState";
import { asString, isRecord } from "@/services/contracts/guards";
import type {
  AiChatRunRequest,
  AiChatRunResponse,
} from "@/services/ai/contracts";
import {
  getErrorStatus,
  isServiceError,
} from "@/services/contracts/serviceError";
import { captureException } from "@/services/core/errorLogger";
import { getAiUxErrorType, type AiUxErrorType } from "@/services/ai/uxError";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import {
  getDeadLetterCount,
  retryDeadLetterOps,
  type QueueKind,
} from "@/services/offline/queue.repo";
import { requestSync } from "@/services/offline/sync.engine";
import {
  type ChatMessageCursor,
  fetchChatThreadMessagesPage,
  persistAssistantChatMessage,
  persistUserChatMessage,
  subscribeToChatThreadMessages,
} from "@/services/ai/chatThreadRepository";

type Options = { pageSize?: number };

type RetryableSendContext = {
  threadId: string;
  userMessageId: string;
  content: string;
  createdAt: number;
};

const GATEWAY_REJECT_REASONS = new Set([
  "OFF_TOPIC",
  "ML_OFF_TOPIC",
  "TOO_SHORT",
]);
const CHAT_DEAD_LETTER_KINDS: QueueKind[] = ["persist_chat_message"];

function findInsertIndexDesc(
  messages: ChatMessage[],
  createdAt: number,
): number {
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
  const canonicalDetail = isRecord(details.detail) ? details.detail : details;
  return asString(canonicalDetail.reason) || asString(details.reason) || null;
}

function getGatewayRejectCode(error: unknown): string | null {
  if (getErrorStatus(error) !== 400 || !isRecord(error)) return null;
  const details = isRecord(error.details) ? error.details : null;
  if (!details) return null;
  const canonicalDetail = isRecord(details.detail) ? details.detail : details;
  return asString(canonicalDetail.code) || asString(details.code) || null;
}

export function useChatHistory(
  userUid: string,
  meals: Meal[],
  profile: FormData,
  threadId: string,
  opts: Options = {},
) {
  void meals;
  void profile;
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
  const [sendErrorType, setSendErrorType] = useState<AiUxErrorType | null>(
    null,
  );
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
      if (!trimmed || !canSend || sending || sendInFlightRef.current)
        return null;

      const net = await NetInfo.fetch();
      if (isOfflineNetState(net)) return null;
      if (!userUid) return null;

      const requestId = uuidv4();
      activeSendRequestIdRef.current = requestId;
      sendInFlightRef.current = true;
      const chatRunAbortController = new AbortController();
      sendAbortControllerRef.current = chatRunAbortController;

      setSending(true);
      setTyping(true);
      setSendErrorType(null);

      const isRetryAttempt = !!retryContext;
      const now = retryContext?.createdAt ?? Date.now();
      const createdThreadId =
        retryContext?.threadId ?? (isLocalThread ? uuidv4() : threadId);
      const userMsgId = retryContext?.userMessageId ?? uuidv4();
      const aiMsgId = uuidv4();
      const isRequestActive = () =>
        activeSendRequestIdRef.current === requestId;

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
            syncToBackend: false,
          });
        }

        let chatRunFailed = false;
        let assistantReply: string | null = null;
        let assistantMessageIdFromServer: string | null = null;
        try {
          if (!isRequestActive()) return null;
          const chatRunPayload: AiChatRunRequest = {
            threadId: createdThreadId,
            clientMessageId: userMsgId,
            message: trimmed,
            language: i18next.language === "pl" ? "pl" : "en",
          };
          const aiResponse = await post<AiChatRunResponse>(
            "/api/v2/ai/chat/runs",
            chatRunPayload,
            {
              signal: chatRunAbortController.signal,
              retryMode: "idempotent",
            },
          );

          if (!isRequestActive()) return null;

          assistantReply = aiResponse.reply?.trim() ? aiResponse.reply : null;
          assistantMessageIdFromServer =
            typeof aiResponse.assistantMessageId === "string" &&
            aiResponse.assistantMessageId.trim().length > 0
              ? aiResponse.assistantMessageId
              : null;
          if (!assistantReply) {
            setSendErrorType("unknown");
          }
          applyCreditsFromResponse(aiResponse);
        } catch (error) {
          if (isServiceError(error) && error.code === "api/aborted") {
            return null;
          }
          if (!isRequestActive()) return null;

          const status = getErrorStatus(error);
          const gatewayCode = getGatewayRejectCode(error);
          const gatewayReason = getGatewayRejectReason(error);
          const errorType = getAiUxErrorType(error);
          if (status === 402) {
            const refreshed = await refreshCredits();
            const refreshedLimit = refreshed?.allocation ?? creditAllocation;
            const refreshedUsed = refreshed
              ? Math.max(refreshedLimit - refreshed.balance, 0)
              : creditsUsed;
            void refreshedUsed;
            setSendErrorType(null);
          } else if (
            gatewayCode === "AI_GATEWAY_BLOCKED" ||
            (gatewayReason !== null &&
              GATEWAY_REJECT_REASONS.has(gatewayReason))
          ) {
            setSendErrorType(null);
          } else if (status === 429) {
            setSendErrorType(null);
          } else if (errorType === "offline") {
            setSendErrorType("offline");
          } else if (errorType === "timeout") {
            setSendErrorType("timeout");
          } else if (errorType === "unavailable") {
            setSendErrorType("unavailable");
          } else if (errorType === "auth") {
            setSendErrorType("auth");
          } else {
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
          chatRunFailed = true;
        }

        if (!assistantReply || chatRunFailed) {
          if (!chatRunFailed) {
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
        const assistantMessageId = assistantMessageIdFromServer ?? aiMsgId;

        const optimisticAi: ChatMessage = {
          id: assistantMessageId,
          userUid,
          role: "assistant",
          content: assistantReply,
          createdAt: now2,
          lastSyncedAt: now2,
          syncState: "synced",
          deleted: false,
          cloudId: assistantMessageId,
        };

        setMessages((prev) => upsertSortedMessage(prev, optimisticAi));

        await persistAssistantChatMessage({
          userUid,
          threadId: createdThreadId,
          messageId: assistantMessageId,
          content: assistantReply,
          createdAt: now2,
          syncToBackend: false,
        });
        void requestSync({
          uid: userUid,
          domain: "chat",
          reason: "local-change",
        }).catch(() => {});

        if (isLocalThread && !isRetryAttempt) return createdThreadId;
        return null;
      } finally {
        if (
          isMountedRef.current &&
          activeSendRequestIdRef.current === requestId
        ) {
          activeSendRequestIdRef.current = null;
          sendInFlightRef.current = false;
          if (sendAbortControllerRef.current === chatRunAbortController) {
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
      if (retried > 0 && !isOfflineNetState(net)) {
        await requestSync({
          uid: userUid,
          domain: "chat",
          reason: "retry",
        });
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
