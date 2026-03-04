// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import i18next from "i18next";
import { v4 as uuidv4 } from "uuid";
import type { Meal, FormData, ChatMessage } from "@/types";
import { get, post } from "@/services/apiClient";
import { withVersion } from "@/services/apiVersioning";
import type {
  AiAskBackendResponse,
  AiUsageResponse,
} from "@/services/ai/contracts";
import { getAiDailyLimit } from "@/services/ai/contracts";
import { captureException } from "@/services/errorLogger";
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

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

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
        const usage = await get<AiUsageResponse>(withVersion("/ai/usage"));

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
  const loading = messagesLoading || usageLoading;

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
        const aiResponse = await post<AiAskBackendResponse>(withVersion("/ai/ask"), {
          message: trimmed,
          context: buildAiContext(meals, profile, [
            ...historyForAi,
            { from: "user", text: trimmed },
          ]),
        });
        aiText = aiResponse.reply;
        applyBackendUsage({
          usageCount: aiResponse.usageCount,
          remaining: aiResponse.remaining,
          dailyLimit: getAiDailyLimit(aiResponse),
        });
      } catch (error) {
        if (getErrorStatus(error) === 429) {
          setRemainingToday(0);
          setDailyUsed((prev) => Math.max(prev, dailyLimit));
          aiText = i18next.t(
            "limit.reachedShort",
            {
              ns: "chat",
              used: dailyLimit,
              limit: dailyLimit,
            },
          );
        } else {
          aiText = i18next.t(
            "chat:errors.fetchFailed",
            "Could not fetch a response. Please try again.",
          );
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
    sending,
    typing,
    canSend,
    countToday: dailyUsed,
    usageCount: dailyUsed,
    dailyLimit,
    remaining: remainingToday,
    loadMore,
    send,
  };
}
