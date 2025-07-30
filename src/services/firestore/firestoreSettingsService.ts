import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "@react-native-firebase/firestore";
import type { Setting } from "@/src/types";

const COLLECTION = "settings";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

export async function fetchSettingsFromFirestore(
  userUid: string
): Promise<Setting[]> {
  const db = getDb();
  const q = query(collection(db, COLLECTION), where("userUid", "==", userUid));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap: any) => docSnap.data() as Setting);
}

export async function updateSettingInFirestore(
  userUid: string,
  key: string,
  value: string,
  lastUpdated: string
) {
  const db = getDb();
  await setDoc(
    doc(collection(db, COLLECTION), `${userUid}_${key}`),
    { userUid, key, value, lastUpdated, syncState: "synced" },
    { merge: true }
  );
}

export async function markSettingSyncedInFirestore(
  userUid: string,
  key: string,
  lastUpdated: string
) {
  const db = getDb();
  await updateDoc(doc(collection(db, COLLECTION), `${userUid}_${key}`), {
    syncState: "synced",
    lastUpdated,
  });
}
