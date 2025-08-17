import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit as fbLimit,
  onSnapshot,
  getDocs,
  startAfter,
  setDoc,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import type { Meal, FormData, ChatMessage } from "@/types";
import { askDietAI, type Message } from "@/services/askDietAI";

type Options = { pageSize?: number };

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
  const [typing, setTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef =
    useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);

  const app = getApp();
  const db = getFirestore(app);

  const baseCol = userUid
    ? collection(db, "users", userUid, "chat_messages")
    : null;

  const countToday = useMemo(() => {
    const today = startOfDayMs(Date.now());
    return messages.filter((m) => m.role === "user" && m.createdAt >= today)
      .length;
  }, [messages]);

  const canSend = isPremium || countToday < 5;

  useEffect(() => {
    if (!baseCol) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const q = query(baseCol, orderBy("createdAt", "desc"), fbLimit(pageSize));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d: any) => {
          const data = d.data() as any;
          const item: ChatMessage = {
            id: d.id,
            userUid,
            role: data.role,
            content: data.content,
            createdAt:
              typeof data.createdAt === "number" ? data.createdAt : Date.now(),
            lastSyncedAt:
              typeof data.lastSyncedAt === "number" ? data.lastSyncedAt : 0,
            syncState: "synced",
            deleted: !!data.deleted,
            cloudId: d.id,
          };
          return item;
        });
        setMessages(items);
        lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMore(!!lastDocRef.current);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return unsub;
  }, [userUid]);

  const loadMore = useCallback(async () => {
    if (!baseCol || !hasMore || !lastDocRef.current) return;
    const q = query(
      baseCol,
      orderBy("createdAt", "desc"),
      startAfter(lastDocRef.current),
      fbLimit(pageSize)
    );
    const snap = await getDocs(q);
    const older = snap.docs.map((d: any) => {
      const data = d.data() as any;
      const item: ChatMessage = {
        id: d.id,
        userUid,
        role: data.role,
        content: data.content,
        createdAt:
          typeof data.createdAt === "number" ? data.createdAt : Date.now(),
        lastSyncedAt:
          typeof data.lastSyncedAt === "number" ? data.lastSyncedAt : 0,
        syncState: "synced",
        deleted: !!data.deleted,
        cloudId: d.id,
      };
      return item;
    });
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of older) map.set(m.id, m);
      const merged = Array.from(map.values()).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      return merged;
    });
    lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
    setHasMore(!!lastDocRef.current);
  }, [baseCol, hasMore, pageSize, userUid]);

  const send = useCallback(
    async (text: string) => {
      setError(null);
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!canSend || sending) return;
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        setError("OFFLINE");
        return;
      }
      if (!baseCol) return;

      setSending(true);

      const userMsgId = uuidv4();
      const userDoc = doc(baseCol, userMsgId);
      const userMsg: ChatMessage = {
        id: userMsgId,
        userUid,
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
        lastSyncedAt: Date.now(),
        syncState: "synced",
        deleted: false,
        cloudId: userMsgId,
      };
      await setDoc(
        userDoc,
        {
          role: userMsg.role,
          content: userMsg.content,
          createdAt: userMsg.createdAt,
          lastSyncedAt: userMsg.lastSyncedAt,
          deleted: false,
        },
        { merge: true }
      );

      setTyping(true);

      let aiText = "";
      try {
        const recentMeals = meals
          ?.slice()
          .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        const historyForAiBase: Message[] = messages.slice(-10).map((m) => ({
          from: m.role === "user" ? "user" : "ai",
          text: m.content,
        }));
        const historyForAi: Message[] = [
          ...historyForAiBase,
          { from: "user", text: trimmed },
        ];
        aiText = await askDietAI(
          trimmed,
          recentMeals as any,
          historyForAi,
          profile
        );
      } catch {
        setError("AI_ERROR");
      }

      const assistantMsgId = uuidv4();
      const assistantDoc = doc(baseCol, assistantMsgId);
      const now = Date.now();
      await setDoc(
        assistantDoc,
        {
          role: "assistant",
          content: aiText || "",
          createdAt: now,
          lastSyncedAt: now,
          deleted: false,
        },
        { merge: true }
      );

      setTyping(false);
      setSending(false);
    },
    [baseCol, canSend, sending, meals, profile, messages, userUid]
  );

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
