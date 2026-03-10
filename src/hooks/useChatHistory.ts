// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import i18next from "i18next";
import { v4 as uuidv4 } from "uuid";
import type { Meal, FormData, ChatMessage } from "@/types";
import { get, post } from "@/services/apiClient";
import { asString, isRecord } from "@/services/contracts/guards";
import type {
  AiAskBackendResponse,
  AiUsageResponse,
} from "@/services/ai/contracts";
import {
  getAiDailyLimit,
  readAiUsageStatusFromApiErrorDetails,
} from "@/services/ai/contracts";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { captureException } from "@/services/errorLogger";
import { getAiUxErrorType, type AiUxErrorType } from "@/services/ai/uxError";
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

const DEFAULT_CHAT_DAILY_LIMIT = 5;
const GATEWAY_REJECT_REASONS = new Set(["OFF_TOPIC", "ML_OFF_TOPIC", "TOO_SHORT"]);

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
  isPremium: boolean,
  meals: Meal[],
  profile: FormData,
  threadId: string,
  opts: Options = {},
) {
  const pageSize = opts.pageSize ?? 50;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(!!userUid);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sendErrorType, setSendErrorType] = useState<AiUxErrorType | null>(null);

  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_CHAT_DAILY_LIMIT);
  const [remainingToday, setRemainingToday] = useState(DEFAULT_CHAT_DAILY_LIMIT);

  const lastDocRef = useRef<ChatMessageCursor>(null);

  const isLocalThread = threadId.startsWith("local-");
  const canReadThread = !!userUid && !!threadId && !isLocalThread;

  const applyBackendUsage = useCallback(
    (usage: {
      usageCount: number;
      remaining: number;
      dailyLimit?: number;
    }) => {
      setDailyUsed(usage.usageCount);
      setRemainingToday(usage.remaining);
      setDailyLimit(
        usage.dailyLimit ?? getAiDailyLimit(usage),
      );
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userUid) {
        /* istanbul ignore next -- defensive mounted check for sync branch */
        if (mounted) {
          setDailyUsed(0);
          setDailyLimit(DEFAULT_CHAT_DAILY_LIMIT);
          setRemainingToday(DEFAULT_CHAT_DAILY_LIMIT);
          setUsageLoading(false);
        }
        return;
      }

      if (mounted) {
        setUsageLoading(true);
      }

      try {
        const usage = await get<AiUsageResponse>("/ai/usage");

        /* istanbul ignore next -- defensive mounted check for async branch */
        if (mounted) {
          applyBackendUsage(usage);
        }
      } catch (error) {
        captureException(
          "[useChatHistory] failed to load AI usage",
          { userUid },
          error,
        );
        /* istanbul ignore next -- defensive mounted check for async branch */
        if (mounted) {
          setDailyUsed(0);
          setDailyLimit(DEFAULT_CHAT_DAILY_LIMIT);
          setRemainingToday(DEFAULT_CHAT_DAILY_LIMIT);
        }
      } finally {
        /* istanbul ignore next -- defensive mounted check for async branch */
        if (mounted) {
          setUsageLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyBackendUsage, userUid]);

  const canSend = isPremium || remainingToday > 0;
  const loading = messagesLoading;

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
        if (!aiResponse.reply?.trim()) {
          setSendErrorType("unknown");
        }
        applyBackendUsage({
          usageCount: aiResponse.usageCount,
          remaining: aiResponse.remaining,
          dailyLimit: aiResponse.dailyLimit ?? getAiDailyLimit(aiResponse),
        });
      } catch (error) {
        const status = getErrorStatus(error);
        const gatewayReason = getGatewayRejectReason(error);
        const errorType = getAiUxErrorType(error);
        if (status === 429) {
          const usageFromError = isRecord(error)
            ? readAiUsageStatusFromApiErrorDetails(error.details)
            : null;
          const limitForMessage = usageFromError?.dailyLimit ?? dailyLimit;
          if (usageFromError) {
            applyBackendUsage(usageFromError);
          } else {
            setRemainingToday(0);
            setDailyUsed((prev) => Math.max(prev, dailyLimit));
          }
          aiText = i18next.t(
            "limit.reachedShort",
            {
              ns: "chat",
              used: limitForMessage,
              limit: limitForMessage,
            },
          );
          setSendErrorType(null);
        } else if (
          gatewayReason !== null &&
          GATEWAY_REJECT_REASONS.has(gatewayReason)
        ) {
          aiText = i18next.t(
            "chat:errors.offTopic",
            "Moge odpowiadac tylko na pytania o zywienie i diete.",
          );
          setSendErrorType(null);
        } else if (errorType === "offline") {
          aiText = i18next.t(
            "chat:errors.offline",
            "You're offline. Reconnect and try again.",
          );
          setSendErrorType("offline");
        } else if (errorType === "timeout") {
          aiText = i18next.t(
            "chat:errors.timeout",
            "The request timed out. Please retry.",
          );
          setSendErrorType("timeout");
        } else if (errorType === "unavailable") {
          aiText = i18next.t(
            "chat:errors.serviceUnavailable",
            "AI is temporarily unavailable. Please try again shortly.",
          );
          setSendErrorType("unavailable");
        } else if (errorType === "auth") {
          aiText = i18next.t(
            "chat:errors.authRequired",
            "Please sign in again to continue.",
          );
          setSendErrorType("auth");
        } else {
          aiText = i18next.t(
            "chat:errors.fetchFailed",
            "Could not fetch a response. Please try again.",
          );
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
      dailyLimit,
      applyBackendUsage,
    ],
  );

  return {
    messages,
    loading,
    usageLoading,
    sending,
    typing,
    canSend,
    countToday: dailyUsed,
    usageCount: dailyUsed,
    dailyLimit,
    remaining: remainingToday,
    sendErrorType,
    loadMore,
    send,
  };
}
