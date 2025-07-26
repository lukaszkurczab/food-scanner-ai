import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "@react-native-firebase/firestore";
import type { FormData } from "@/src/types";

export interface FirestoreSurvey {
  id: string;
  userUid: string;
  formData: FormData | string;
  completedAt: string;
  syncStatus?: string;
}

const SURVEYS_COLLECTION = "surveys";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

export async function fetchSurveyFromFirestore(
  userUid: string
): Promise<FirestoreSurvey | null> {
  const db = getDb();

  const q = query(
    collection(db, SURVEYS_COLLECTION),
    where("userUid", "==", userUid),
    orderBy("completedAt", "desc"),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as Omit<FirestoreSurvey, "id">;
    return { id: docSnap.id, ...data };
  }
  return null;
}

export async function upsertSurveyInFirestore(
  userUid: string,
  data: FormData,
  completedAt: string
) {
  const db = getDb();
  await setDoc(
    doc(collection(db, SURVEYS_COLLECTION), userUid),
    {
      userUid,
      formData: JSON.stringify(data),
      completedAt,
      syncStatus: "synced",
    },
    { merge: true }
  );
}
