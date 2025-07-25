import firestore from "@react-native-firebase/firestore";
import type { FormData } from "@/src/types";

export interface FirestoreSurvey {
  id: string;
  userUid: string;
  formData: FormData | string;
  completedAt: string;
  syncStatus?: string;
}

const SURVEYS_COLLECTION = "surveys";

export async function fetchSurveyFromFirestore(
  userUid: string
): Promise<FirestoreSurvey | null> {
  const q = await firestore()
    .collection(SURVEYS_COLLECTION)
    .where("userUid", "==", userUid)
    .orderBy("completedAt", "desc")
    .limit(1)
    .get();

  if (!q.empty) {
    const doc = q.docs[0];
    const data = doc.data() as Omit<FirestoreSurvey, "id">;
    return { id: doc.id, ...data };
  }
  return null;
}

export async function upsertSurveyInFirestore(
  userUid: string,
  data: FormData,
  completedAt: string
) {
  await firestore()
    .collection(SURVEYS_COLLECTION)
    .doc(userUid)
    .set(
      {
        userUid,
        formData: JSON.stringify(data),
        completedAt,
        syncStatus: "synced",
      },
      { merge: true }
    );
}
