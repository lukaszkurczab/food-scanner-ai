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
import type { Meal } from "@/src/types";

const MEALS_COLLECTION = "meals";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

export async function fetchMealsFromFirestore(
  userUid: string
): Promise<Meal[]> {
  const db = getDb();
  const q = query(
    collection(db, MEALS_COLLECTION),
    where("userUid", "==", userUid)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (docSnap: any) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      } as Meal)
  );
}

export async function upsertMealInFirestore(meal: Meal) {
  const db = getDb();
  const id = meal.cloudId || meal.id;
  await setDoc(doc(collection(db, MEALS_COLLECTION), id), meal, {
    merge: true,
  });
}

export async function deleteMealInFirestore(meal: Meal) {
  const db = getDb();
  const id = meal.cloudId || meal.id;
  await updateDoc(doc(collection(db, MEALS_COLLECTION), id), {
    deleted: true,
    syncStatus: "synced",
  });
}
