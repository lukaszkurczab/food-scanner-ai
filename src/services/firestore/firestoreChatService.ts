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
  where,
} from "@react-native-firebase/firestore";
import type { ChatMessage } from "@/src/types";

const COLLECTION = "chat_messages";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

export async function fetchChatMessagesFromFirestore(
  userUid: string
): Promise<ChatMessage[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where("userUid", "==", userUid));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((docSnap: any) => {
    const data = docSnap.data() as ChatMessage;
    return {
      ...data,
      id: docSnap.id,
    };
  });
}

export async function addChatMessageToFirestore(
  message: ChatMessage
): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...message,
    id: undefined,
  });
  return ref.id;
}

export async function updateChatMessageInFirestore(
  cloudId: string,
  message: ChatMessage
) {
  const db = getDb();
  await setDoc(
    doc(collection(db, COLLECTION), cloudId),
    {
      ...message,
      id: cloudId,
    },
    { merge: true }
  );
}

export async function deleteChatMessageInFirestore(
  cloudId: string,
  hard = false
) {
  const db = getDb();
  const msgDoc = doc(collection(db, COLLECTION), cloudId);
  if (hard) {
    await deleteDoc(msgDoc);
  } else {
    await updateDoc(msgDoc, {
      deleted: true,
      syncStatus: "synced",
    });
  }
}

export async function markChatMessageSyncedInFirestore(
  cloudId: string,
  timestamp?: string
) {
  const db = getDb();
  await updateDoc(doc(collection(db, COLLECTION), cloudId), {
    syncStatus: "synced",
    updatedAt: timestamp || new Date().toISOString(),
  });
}
