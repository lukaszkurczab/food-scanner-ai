// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import i18next from "i18next";
import { v4 as uuidv4 } from "uuid";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  setDoc,
  writeBatch,
} from "@react-native-firebase/firestore";
import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import type { Meal, FormData, ChatMessage } from "@/types";
import { get, post } from "@/services/apiClient";
import { withVersion } from "@/services/apiVersioning";
import { captureException } from "@/services/errorLogger";

type Options = { pageSize?: number };
type AiUsageResponse = {
  userId: string;
  dateKey: string;
  usageCount: number;
  dailyLimit: number;
  remaining: number;
};
type AiAskResponse = {
  reply: string;
  usageCount: number;
  remaining: number;
  version?: string;
};
type AiHistoryItem = {
  from: "user" | "ai";
  text: string;
};
type ChatMessageDoc = {
  role?: ChatMessage["role"];
  content?: string;
  createdAt?: number;
  lastSyncedAt?: number;
  deleted?: boolean;
};

const DEFAULT_CHAT_DAILY_LIMIT = 5;

function toChatMessage(
  d: FirebaseFirestoreTypes.QueryDocumentSnapshot,
  userUid: string,
): ChatMessage {
  const data = d.data() as ChatMessageDoc;
  const role = data.role;
  return {
    id: d.id,
    userUid,
    role:
      role === "user" || role === "assistant" || role === "system"
        ? role
        : "assistant",
    content: typeof data.content === "string" ? data.content : "",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    lastSyncedAt: typeof data.lastSyncedAt === "number" ? data.lastSyncedAt : 0,
    syncState: "synced",
    deleted: !!data.deleted,
    cloudId: d.id,
  };
}

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

  const lastDocRef =
    useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);

  const isLocalThread = threadId.startsWith("local-");
  const db = getFirestore(getApp());

  const baseCol = useMemo(() => {
    if (!userUid || !threadId) return null;
    if (isLocalThread) return null;
    return collection(
      db,
      "users",
      userUid,
      "chat_threads",
      threadId,
      "messages",
    );
  }, [db, userUid, threadId, isLocalThread]);

  const applyBackendUsage = useCallback(
    (usage: {
      usageCount: number;
      remaining: number;
      dailyLimit?: number;
    }) => {
      setDailyUsed(usage.usageCount);
      setRemainingToday(usage.remaining);
      setDailyLimit(
        usage.dailyLimit ?? Math.max(usage.usageCount + usage.remaining, 0),
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
        const usage = await get<AiUsageResponse>(
          `${withVersion("/ai/usage")}?userId=${encodeURIComponent(userUid)}`,
        );

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
    if (!baseCol) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    const q = query(baseCol, orderBy("createdAt", "desc"), limit(pageSize));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap) return;

        const items = snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
          toChatMessage(d, userUid),
        );

        setMessages(items);
        lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
        setHasMore(!!lastDocRef.current);
        setMessagesLoading(false);
      },
      () => {
        setMessagesLoading(false);
      },
    );

    return unsub;
  }, [baseCol, pageSize, userUid]);

  const loadMore = useCallback(async () => {
    if (!baseCol || !hasMore || !lastDocRef.current) return;

    const q = query(
      baseCol,
      orderBy("createdAt", "desc"),
      startAfter(lastDocRef.current),
      limit(pageSize),
    );

    const snap = await getDocs(q);
    const older = snap.docs.map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
      toChatMessage(d, userUid),
    );

    setMessages((prev) => upsertSortedMessages(prev, older));

    lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
    setHasMore(!!lastDocRef.current);
  }, [baseCol, hasMore, pageSize, userUid]);

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
      const threadRef = doc(
        db,
        "users",
        userUid,
        "chat_threads",
        createdThreadId,
      );
      const messagesCol = collection(threadRef, "messages");

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

      const batch = writeBatch(db);

      if (isLocalThread) {
        batch.set(threadRef, {
          userUid,
          title:
            trimmed.length > 42 ? trimmed.slice(0, 42).trim() + "…" : trimmed,
          createdAt: now,
          updatedAt: now,
          lastMessage: trimmed,
          lastMessageAt: now,
        });
      } else {
        batch.set(
          threadRef,
          {
            userUid,
            updatedAt: now,
            lastMessage: trimmed,
            lastMessageAt: now,
          },
          { merge: true },
        );
      }

      batch.set(doc(messagesCol, userMsgId), {
        role: "user",
        content: trimmed,
        createdAt: now,
        lastSyncedAt: now,
        deleted: false,
      });

      await batch.commit();

      let aiText = "";
      let askFailed = false;
      try {
        const historyForAi: AiHistoryItem[] = messages.slice(0, 10).map((m) => ({
          from: m.role === "user" ? "user" : "ai",
          text: m.content,
        }));
        const aiResponse = await post<AiAskResponse>(withVersion("/ai/ask"), {
          userId: userUid,
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
          dailyLimit: aiResponse.usageCount + aiResponse.remaining,
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

      await setDoc(
        doc(messagesCol, aiMsgId),
        {
          role: "assistant",
          content: aiText,
          createdAt: now2,
          lastSyncedAt: now2,
          deleted: false,
        },
        { merge: true },
      );

      await setDoc(
        threadRef,
        {
          updatedAt: now2,
          lastMessage: aiText,
          lastMessageAt: now2,
        },
        { merge: true },
      );

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
      db,
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
