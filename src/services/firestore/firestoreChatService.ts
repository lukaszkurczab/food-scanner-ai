import firestore from "@react-native-firebase/firestore";
import type { ChatMessage } from "@/src/types";

const COLLECTION = "chat_messages";

export async function fetchChatMessagesFromFirestore(
  userUid: string
): Promise<ChatMessage[]> {
  const querySnapshot = await firestore()
    .collection(COLLECTION)
    .where("userUid", "==", userUid)
    .get();

  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as ChatMessage;
    return {
      ...data,
      id: doc.id,
    };
  });
}

export async function addChatMessageToFirestore(
  message: ChatMessage
): Promise<string> {
  const ref = await firestore()
    .collection(COLLECTION)
    .add({
      ...message,
      id: undefined,
    });
  return ref.id;
}

export async function updateChatMessageInFirestore(
  cloudId: string,
  message: ChatMessage
) {
  await firestore()
    .collection(COLLECTION)
    .doc(cloudId)
    .set(
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
  if (hard) {
    await firestore().collection(COLLECTION).doc(cloudId).delete();
  } else {
    await firestore().collection(COLLECTION).doc(cloudId).update({
      deleted: true,
      syncStatus: "synced",
    });
  }
}

export async function markChatMessageSyncedInFirestore(
  cloudId: string,
  timestamp?: string
) {
  await firestore()
    .collection(COLLECTION)
    .doc(cloudId)
    .update({
      syncStatus: "synced",
      updatedAt: timestamp || new Date().toISOString(),
    });
}
