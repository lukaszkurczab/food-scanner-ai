import firestore from "@react-native-firebase/firestore";
import { Setting } from "@/src/types";

const COLLECTION = "settings";

export async function fetchSettingsFromFirestore(
  userUid: string
): Promise<Setting[]> {
  const snapshot = await firestore()
    .collection(COLLECTION)
    .where("userUid", "==", userUid)
    .get();

  return snapshot.docs.map((doc) => doc.data() as Setting);
}

export async function updateSettingInFirestore(
  userUid: string,
  key: string,
  value: string,
  lastUpdated: string
) {
  await firestore()
    .collection(COLLECTION)
    .doc(`${userUid}_${key}`)
    .set(
      { userUid, key, value, lastUpdated, syncStatus: "synced" },
      { merge: true }
    );
}

export async function markSettingSyncedInFirestore(
  userUid: string,
  key: string,
  lastUpdated: string
) {
  await firestore()
    .collection(COLLECTION)
    .doc(`${userUid}_${key}`)
    .update({ syncStatus: "synced", lastUpdated });
}
