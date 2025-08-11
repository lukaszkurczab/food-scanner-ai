import { getApp } from "@react-native-firebase/app";
import { getFirestore, doc, getDoc } from "@react-native-firebase/firestore";

export function normalizeUsername(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

export async function isUsernameAvailable(
  candidate: string,
  currentUid?: string | null
): Promise<boolean> {
  const username = normalizeUsername(candidate);
  if (!username) return false;

  const db = getFirestore(getApp());
  const ref = doc(db, "usernames", username);
  const snap = await getDoc(ref);

  if (!snap.exists) return true;

  const data = snap.data() as { uid?: string } | undefined;
  if (data?.uid && currentUid && data.uid === currentUid) return true;

  return false;
}
