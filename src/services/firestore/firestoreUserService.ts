import firestore from "@react-native-firebase/firestore";
import type { UserData } from "@/src/types";

const USERS_COLLECTION = "users";

export async function fetchUserFromFirestore(
  uid: string
): Promise<UserData | null> {
  const doc = await firestore().collection(USERS_COLLECTION).doc(uid).get();
  return doc.exists() ? (doc.data() as UserData) : null;
}

export async function updateUserInFirestore(
  uid: string,
  data: Partial<UserData>
) {
  await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .set(data, { merge: true });
}

export async function markUserSyncedInFirestore(
  uid: string,
  timestamp: string
) {
  await firestore().collection(USERS_COLLECTION).doc(uid).update({
    syncStatus: "synced",
    lastSyncedAt: timestamp,
  });
}
