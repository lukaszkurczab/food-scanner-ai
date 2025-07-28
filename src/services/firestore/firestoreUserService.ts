import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from "@react-native-firebase/firestore";
import type { UserData } from "@/src/types";

const USERS_COLLECTION = "users";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

async function deleteSubcollection(
  parentDocRef: ReturnType<typeof doc>,
  subcollectionName: string
) {
  const subcollectionRef = collection(parentDocRef, subcollectionName);
  const snapshot = await getDocs(subcollectionRef);
  const batchSize = 500;

  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batchDocs = docs.slice(i, i + batchSize);
    const db = getDb();
    const batch = writeBatch(db);

    batchDocs.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
  }
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

export async function deleteUserInFirestore(uid: string) {
  const db = getDb();
  const userDocRef = doc(collection(db, USERS_COLLECTION), uid);
  const subcollections = ["meals", "chatMessages"];

  for (const sub of subcollections) {
    await deleteSubcollection(userDocRef, sub);
  }

  await deleteDoc(userDocRef);
}
