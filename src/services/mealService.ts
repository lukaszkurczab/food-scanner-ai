import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
} from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import type { Meal } from "@/types";

const USERS_COLLECTION = "users";
const MEALS_SUBCOLLECTION = "meals";

function getDb() {
  const app = getApp();
  return getFirestore(app);
}

function getPhotoStoragePath(userUid: string, cloudId: string) {
  return `meals/${userUid}/${cloudId}.jpg`;
}

export async function fetchMealsFromFirestore(
  userUid: string
): Promise<Meal[]> {
  const db = getDb();
  const mealsCollection = collection(
    db,
    USERS_COLLECTION,
    userUid,
    MEALS_SUBCOLLECTION
  );
  const snapshot = await getDocs(mealsCollection);
  return snapshot.docs.map((docSnap: any) => ({
    ...(docSnap.data() as Meal),
    cloudId: docSnap.id,
  }));
}

export async function upsertMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null
) {
  if (!meal.cloudId) throw new Error("Meal must have cloudId");
  const db = getDb();
  const mealDoc = doc(
    db,
    USERS_COLLECTION,
    userUid,
    MEALS_SUBCOLLECTION,
    meal.cloudId
  );

  if (!photoUri) {
    await setDoc(mealDoc, meal, { merge: true });
    return;
  }

  const photoPath = getPhotoStoragePath(userUid, meal.cloudId);
  try {
    await storage().ref(photoPath).putFile(photoUri);

    await setDoc(mealDoc, meal, { merge: true });
  } catch (err) {
    throw err;
  }
}

export async function deleteMealPhoto(userUid: string, cloudId: string) {
  const photoPath = getPhotoStoragePath(userUid, cloudId);
  try {
    await storage().ref(photoPath).delete();
  } catch (err: any) {
    if (err.code !== "storage/object-not-found") {
      throw err;
    }
  }
}

export async function deleteMealInFirestore(userUid: string, meal: Meal) {
  if (!meal.cloudId) throw new Error("Meal must have cloudId");
  const db = getDb();
  const mealDoc = doc(
    db,
    USERS_COLLECTION,
    userUid,
    MEALS_SUBCOLLECTION,
    meal.cloudId
  );

  await deleteMealPhoto(userUid, meal.cloudId);

  await updateDoc(mealDoc, {
    deleted: true,
    syncState: "synced",
  });
}
