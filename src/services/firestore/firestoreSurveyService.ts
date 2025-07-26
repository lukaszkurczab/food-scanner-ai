import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from "@react-native-firebase/firestore";
import type { FormData } from "@/src/types";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

export async function fetchSurveyFromFirestore(
  userUid: string
): Promise<FormData | null> {
  const db = getDb();
  const ref = doc(db, "users", userUid);
  const snap = await getDoc(ref);

  if (!snap.exists) return null;
  const data = snap.data();

  if (!data) return null;

  return {
    unitsSystem: data.unitsSystem,
    age: data.age,
    sex: data.sex,
    height: data.height,
    heightInch: data.heightInch,
    weight: data.weight,
    preferences: data.preferences,
    activityLevel: data.activityLevel,
    goal: data.goal,
    calorieDeficit: data.calorieDeficit,
    calorieSurplus: data.calorieSurplus,
    chronicDiseases: data.chronicDiseases,
    chronicDiseasesOther: data.chronicDiseasesOther,
    allergies: data.allergies,
    allergiesOther: data.allergiesOther,
    lifestyle: data.lifestyle,
    aiStyle: data.aiStyle,
    aiFocus: data.aiFocus,
    aiFocusOther: data.aiFocusOther,
    aiNote: data.aiNote,
  };
}

export async function upsertSurveyInFirestore(userUid: string, data: FormData) {
  const db = getDb();
  const ref = doc(db, "users", userUid);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}
