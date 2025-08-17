import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "@react-native-firebase/firestore";
import type { ChatMessage } from "@/types";

function db() {
  return getFirestore(getApp());
}

function col(userUid: string) {
  return collection(db(), "users", userUid, "chat_messages");
}

export type ChatPage = { items: ChatMessage[]; nextCursor: any | null };

export function subscribeToChat(
  userUid: string,
  onUpdate: (messages: ChatMessage[]) => void,
  pageSize = 50
) {
  const q = query(col(userUid), orderBy("createdAt", "desc"), limit(pageSize));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d: any) => ({
      ...(d.data() as ChatMessage),
      id: d.id,
    }));
    onUpdate(items);
  });
}

export async function fetchPage(
  userUid: string,
  pageSize = 50,
  cursor?: any | null
): Promise<ChatPage> {
  const base = query(
    col(userUid),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const q = cursor ? query(base, startAfter(cursor)) : base;
  const snap = await getDocs(q);
  const items = snap.docs.map((d: any) => ({
    ...(d.data() as ChatMessage),
    id: d.id,
  }));
  const nextCursor =
    snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  return { items, nextCursor };
}

export async function addChatMessage(message: ChatMessage): Promise<string> {
  const ref = await addDoc(col(message.userUid), {
    userUid: message.userUid,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt ?? Date.now(),
    deleted: !!message.deleted,
  });
  return ref.id;
}

export async function upsertChatMessage(
  cloudId: string,
  message: ChatMessage
): Promise<void> {
  await setDoc(
    doc(col(message.userUid), cloudId),
    {
      userUid: message.userUid,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt ?? Date.now(),
      deleted: !!message.deleted,
    },
    { merge: true }
  );
}

export async function softDeleteChatMessage(
  userUid: string,
  cloudId: string
): Promise<void> {
  await updateDoc(doc(col(userUid), cloudId), {
    deleted: true,
    updatedAt: Date.now(),
  });
}
