import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "@react-native-firebase/firestore";
import type { UserData } from "@/src/types";

const USERS_COLLECTION = "users";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

export async function fetchUserFromFirestore(
  uid: string
): Promise<UserData | null> {
  const db = getDb();
  const userDoc = await getDoc(doc(collection(db, USERS_COLLECTION), uid));
  return userDoc.exists() ? (userDoc.data() as UserData) : null;
}

export async function updateUserInFirestore(
  uid: string,
  data: Partial<UserData>
) {
  const db = getDb();
  await setDoc(doc(collection(db, USERS_COLLECTION), uid), data, {
    merge: true,
  });
}

export async function markUserSyncedInFirestore(
  uid: string,
  timestamp: string
) {
  const db = getDb();
  await updateDoc(doc(collection(db, USERS_COLLECTION), uid), {
    syncStatus: "synced",
    lastSyncedAt: timestamp,
  });
}
