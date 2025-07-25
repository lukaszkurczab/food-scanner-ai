import firestore from "@react-native-firebase/firestore";
import type { Meal } from "@/src/types";

const MEALS_COLLECTION = "meals";

export async function fetchMealsFromFirestore(
  userUid: string
): Promise<Meal[]> {
  const snapshot = await firestore()
    .collection(MEALS_COLLECTION)
    .where("userUid", "==", userUid)
    .get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Meal));
}

export async function upsertMealInFirestore(meal: Meal) {
  const id = meal.cloudId || meal.id;
  await firestore()
    .collection(MEALS_COLLECTION)
    .doc(id)
    .set(meal, { merge: true });
}

export async function deleteMealInFirestore(meal: Meal) {
  const id = meal.cloudId || meal.id;
  await firestore()
    .collection(MEALS_COLLECTION)
    .doc(id)
    .update({ deleted: true, syncStatus: "synced" });
}
