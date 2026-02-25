// src/hooks/useChatHistory.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { askDietAI, type Message } from "@/services/askDietAI";

type Options = { pageSize?: number };
type ChatMessageDoc = {
  role?: ChatMessage["role"];
  content?: string;
  createdAt?: number;
  lastSyncedAt?: number;
  deleted?: boolean;
};

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

function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dailyCountKey(uid: string, day: string) {
  return `chatDailyCount:${uid}:${day}`;
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [dailyUsed, setDailyUsed] = useState(0);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userUid) {
        /* istanbul ignore next -- defensive mounted check for sync branch */
        if (mounted) setDailyUsed(0);
        return;
      }
      const key = dailyCountKey(userUid, dayKey());
      const raw = await AsyncStorage.getItem(key);
      const n = raw ? Number(raw) : 0;
      /* istanbul ignore next -- defensive mounted check for async branch */
      if (mounted) setDailyUsed(Number.isFinite(n) ? n : 0);
    })();
    return () => {
      mounted = false;
    };
  }, [userUid]);

  const canSend = isPremium || dailyUsed < 5;

  useEffect(() => {
    if (!baseCol) {
      setMessages([]);
      setLoading(false);
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
        setLoading(false);
      },
      () => {
        setLoading(false);
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

    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of older) map.set(m.id, m);
      return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    });

    lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
    setHasMore(!!lastDocRef.current);
  }, [baseCol, hasMore, pageSize, userUid]);

  const bumpDailyUsed = useCallback(async () => {
    /* istanbul ignore next -- send() already guards empty uid */
    if (!userUid) return;
    const key = dailyCountKey(userUid, dayKey());
    setDailyUsed((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(key, String(next));
      return next;
    });
  }, [userUid]);

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

      setMessages((prev) => [optimisticUser, ...prev]);

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
      await bumpDailyUsed();

      let aiText = "";
      let askFailed = false;
      try {
        const historyForAiBase: Message[] = messages.slice(0, 10).map((m) => ({
          from: m.role === "user" ? "user" : "ai",
          text: m.content,
        }));

        const historyForAi: Message[] = [
          ...historyForAiBase,
          { from: "user", text: trimmed },
        ];

        aiText = await askDietAI(trimmed, meals, historyForAi, profile);
      } catch (error) {
        console.error("[useChatHistory.send] askDietAI failed:", error);
        aiText = i18next.t(
          "chat:errors.fetchFailed",
          "Could not fetch a response. Please try again.",
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

      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        map.set(aiMsgId, optimisticAi);
        return Array.from(map.values()).sort(
          (a, b) => b.createdAt - a.createdAt,
        );
      });

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
      bumpDailyUsed,
    ],
  );

  return {
    messages,
    loading,
    sending,
    typing,
    canSend,
    countToday: dailyUsed,
    loadMore,
    send,
  };
}
