// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import { Q } from "@nozbe/watermelondb";
import ChatMessageModel from "@/src/db/models/ChatMessage";
import type { ChatMessage, ChatsyncState } from "@/src/types";
import type { Meal, FormData } from "@/src/types";
import {
  fetchChatMessagesPageFromFirestore,
  addChatMessageToFirestore,
  upsertChatMessageInFirestore,
  markChatMessageSyncedInFirestore,
} from "@services/chatService";
import { askDietAI, type Message } from "@/src/services/askDietAI";
import { v4 as uuidv4 } from "uuid";

type Options = {
  pageSize?: number;
};

function mapModelToChat(m: ChatMessageModel): ChatMessage {
  return {
    id: m.id,
    userUid: m.userUid,
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    createdAt: m.createdAt,
    lastSyncedAt: m.lastSyncedAt,
    syncState: m.syncState as ChatsyncState,
    cloudId: m.cloudId,
    deleted: !!m.deleted,
  };
}

function startOfDayMs(now: number) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useChatHistory(
  userUid: string,
  isPremium: boolean,
  meals: Meal[],
  profile: FormData,
  opts: Options = {}
) {
  const pageSize = opts.pageSize ?? 50;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<any | null>(null);
  const [typing, setTyping] = useState(false);
  const pendingQueueRef = useRef<ChatMessage[]>([]);

  const countToday = useMemo(() => {
    const today = startOfDayMs(Date.now());
    return messages.filter((m) => m.role === "user" && m.createdAt >= today)
      .length;
  }, [messages]);

  const canSend = isPremium || countToday < 5;

  const loadLocal = useCallback(async () => {
    const collection = database.get<ChatMessageModel>("chatMessages");
    const rows = await collection
      .query(
        Q.where("userUid", userUid),
        Q.where("deleted", false),
        Q.sortBy("createdAt", Q.desc)
      )
      .fetch();
    setMessages(rows.map(mapModelToChat));
    setLoading(false);
  }, [userUid]);

  const pull = useCallback(
    async (reset = false) => {
      const { items, nextCursor } = await fetchChatMessagesPageFromFirestore(
        userUid,
        pageSize,
        reset ? null : cursorRef.current
      );
      cursorRef.current = nextCursor;
      setHasMore(!!nextCursor);
      if (!items.length) {
        if (reset) setLoading(false);
        return;
      }

      const collection = database.get<ChatMessageModel>("chatMessages");
      await database.write(async () => {
        for (const msg of items) {
          const existing = await collection
            .query(Q.where("cloudId", msg.id))
            .fetch();
          if (existing[0]) {
            await existing[0].update((m: any) => {
              m.userUid = msg.userUid;
              m.role = msg.role;
              m.content = msg.content;
              m.createdAt =
                typeof msg.createdAt === "number" ? msg.createdAt : Date.now();
              m.lastSyncedAt =
                typeof msg.lastSyncedAt === "number"
                  ? msg.lastSyncedAt
                  : Date.now();
              m.syncState = "synced";
              m.cloudId = msg.id;
              m.deleted = !!msg.deleted;
            });
          } else {
            await collection.create((m: any) => {
              m.userUid = msg.userUid;
              m.role = msg.role;
              m.content = msg.content;
              m.createdAt =
                typeof msg.createdAt === "number" ? msg.createdAt : Date.now();
              m.lastSyncedAt =
                typeof msg.lastSyncedAt === "number" ? msg.lastSyncedAt : 0;
              m.syncState = "synced";
              m.cloudId = msg.id;
              m.deleted = !!msg.deleted;
            });
          }
        }
      });
      await loadLocal();
    },
    [userUid, pageSize, loadLocal]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    await pull(false);
  }, [hasMore, pull]);

  const pushPending = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    const collection = database.get<ChatMessageModel>("chatMessages");
    const pending = await collection
      .query(Q.where("syncState", "pending"), Q.where("userUid", userUid))
      .fetch();

    for (const row of pending) {
      const data = mapModelToChat(row);
      let cloudId = data.cloudId;
      if (!cloudId) {
        const newId = await addChatMessageToFirestore({
          ...data,
          id: "",
          cloudId: undefined,
          lastSyncedAt: Date.now(),
          syncState: "pending",
        });
        cloudId = newId;
      } else {
        await upsertChatMessageInFirestore(cloudId, data);
      }
      await markChatMessageSyncedInFirestore(cloudId, Date.now(), userUid);
      await database.write(async () => {
        await row.update((m: any) => {
          m.syncState = "synced";
          m.cloudId = cloudId!;
          m.lastSyncedAt = Date.now();
        });
      });
    }
    await loadLocal();
  }, [userUid, loadLocal]);

  const retryPendingWithBackoff = useCallback(() => {
    let attempt = 0;
    const run = async () => {
      attempt += 1;
      try {
        await pushPending();
      } catch {}
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
      setTimeout(run, delay);
    };
    run();
  }, [pushPending]);

  const send = useCallback(
    async (text: string) => {
      setError(null);
      if (!text.trim()) return;
      const net = await NetInfo.fetch();
      if (!canSend || sending || !net.isConnected) return;
      setSending(true);

      const userMsg: ChatMessage = {
        id: uuidv4(),
        userUid,
        role: "user",
        content: text.trim(),
        createdAt: Date.now(),
        lastSyncedAt: 0,
        syncState: "pending",
        deleted: false,
      };

      const collection = database.get<ChatMessageModel>("chatMessages");
      await database.write(async () => {
        await collection.create((m: any) => {
          m.userUid = userMsg.userUid;
          m.role = userMsg.role;
          m.content = userMsg.content;
          m.createdAt = userMsg.createdAt;
          m.lastSyncedAt = userMsg.lastSyncedAt;
          m.syncState = userMsg.syncState;
          m.deleted = false;
        });
      });

      const historyForAiBase: Message[] = messages.slice(-10).map((m) => ({
        from: m.role === "user" ? "user" : "ai",
        text: m.content,
      }));
      let historyForAi: Message[] = [
        ...historyForAiBase,
        { from: "user", text: userMsg.content },
      ];
      if (
        historyForAi.length >= 2 &&
        historyForAi.at(-1)!.from === "user" &&
        historyForAi.at(-2)!.from === "user" &&
        historyForAi.at(-1)!.text === historyForAi.at(-2)!.text
      ) {
        historyForAi = historyForAi.slice(0, -1);
      }

      setTyping(true);
      await loadLocal();

      let aiText = "";
      try {
        const recentMeals = meals
          ?.slice()
          .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        aiText = await askDietAI(
          userMsg.content,
          recentMeals as any,
          historyForAi,
          profile
        );
      } catch (e: any) {
        setError("AI_ERROR");
        aiText = "";
      }

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        userUid,
        role: "assistant",
        content: aiText || "",
        createdAt: Date.now(),
        lastSyncedAt: 0,
        syncState: "pending",
        deleted: false,
      };

      await database.write(async () => {
        await collection.create((m: any) => {
          m.userUid = assistantMsg.userUid;
          m.role = assistantMsg.role;
          m.content = assistantMsg.content;
          m.createdAt = assistantMsg.createdAt;
          m.lastSyncedAt = assistantMsg.lastSyncedAt;
          m.syncState = assistantMsg.syncState;
          m.deleted = false;
        });
      });

      setTyping(false);
      await loadLocal();

      try {
        pendingQueueRef.current.push(userMsg, assistantMsg);
        await pushPending();
      } catch {
        retryPendingWithBackoff();
      } finally {
        setSending(false);
      }
    },
    [
      userUid,
      canSend,
      sending,
      meals,
      profile,
      messages,
      loadLocal,
      pushPending,
      retryPendingWithBackoff,
    ]
  );

  useEffect(() => {
    let unsubNet: any;
    (async () => {
      await loadLocal();
      await pull(true);
      unsubNet = NetInfo.addEventListener((state) => {
        if (state.isConnected) {
          pushPending();
        }
      });
    })();
    return () => {
      if (unsubNet) unsubNet();
    };
  }, [loadLocal, pull, pushPending]);

  return {
    messages,
    loading,
    sending,
    typing,
    error,
    canSend,
    countToday,
    loadMore,
    send,
  };
}
