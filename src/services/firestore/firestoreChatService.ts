// src/services/firestore/firestoreChatService.ts
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
} from "@react-native-firebase/firestore";
import type { ChatMessage } from "@/src/types";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

function messagesCol(db: any, userUid: string) {
  return collection(db, "users", userUid, "chat_messages");
}

export type ChatPage = { items: ChatMessage[]; nextCursor: any | null };

export async function fetchChatMessagesPageFromFirestore(
  userUid: string,
  pageSize = 50,
  cursor?: any | null
): Promise<ChatPage> {
  const db = getDb();
  const base = query(
    messagesCol(db, userUid),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  try {
    const snap = await getDocs(q);
    const items = snap.docs.map((d: any) => {
      const data = d.data() as ChatMessage;
      return { ...data, id: d.id };
    });
    const nextCursor =
      snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
    return { items, nextCursor };
  } catch (e) {
    return { items: [], nextCursor: null };
  }
}

export async function addChatMessageToFirestore(
  message: ChatMessage
): Promise<string> {
  const db = getDb();
  const ref = await addDoc(messagesCol(db, message.userUid), {
    userUid: message.userUid,
    role: message.role,
    content: message.content,
    createdAt:
      typeof message.createdAt === "number" ? message.createdAt : Date.now(),
    lastSyncedAt:
      typeof message.lastSyncedAt === "number" ? message.lastSyncedAt : 0,
    syncState: message.syncState,
    deleted: !!message.deleted,
  });
  return ref.id;
}

export async function upsertChatMessageInFirestore(
  cloudId: string,
  message: ChatMessage
) {
  const db = getDb();
  await setDoc(
    doc(messagesCol(db, message.userUid), cloudId),
    {
      userUid: message.userUid,
      role: message.role,
      content: message.content,
      createdAt:
        typeof message.createdAt === "number" ? message.createdAt : Date.now(),
      lastSyncedAt:
        typeof message.lastSyncedAt === "number"
          ? message.lastSyncedAt
          : Date.now(),
      syncState: message.syncState,
      deleted: !!message.deleted,
    },
    { merge: true }
  );
}

export async function deleteChatMessageInFirestore(
  cloudId: string,
  hard = false,
  userUid?: string
) {
  const db = getDb();
  const msgDoc = doc(messagesCol(db, userUid as string), cloudId);
  if (hard) {
    await deleteDoc(msgDoc);
  } else {
    await updateDoc(msgDoc, {
      deleted: true,
      syncState: "synced",
      lastSyncedAt: Date.now(),
    });
  }
}

export async function markChatMessageSyncedInFirestore(
  cloudId: string,
  timestamp: number,
  userUid: string
) {
  const db = getDb();
  await updateDoc(doc(messagesCol(db, userUid), cloudId), {
    syncState: "synced",
    lastSyncedAt: timestamp ?? Date.now(),
  });
}
