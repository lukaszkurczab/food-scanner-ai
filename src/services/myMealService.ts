import NetInfo from "@react-native-community/netinfo";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  writeBatch,
  collection,
  doc,
  getDocs,
  setDoc,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import type { Meal } from "@/types/meal";

const USERS = "users";
const MY_MEALS = "myMeals";

const app = getApp();
const db = getFirestore(app);
const st = getStorage(app);

const isLocalPhoto = (uri?: string | null) => !!uri && uri.startsWith("file:");

async function uploadPhotoIfNeeded(
  userUid: string,
  docId: string,
  photoUri: string | null
): Promise<string | null> {
  if (!isLocalPhoto(photoUri)) return photoUri ?? null;
  const net = await NetInfo.fetch();
  if (!net.isConnected) return null;
  const path = `myMeals/${userUid}/${docId}.jpg`;
  const r = ref(st, path);
  await putFile(r, photoUri!);
  return await getDownloadURL(r);
}

export async function upsertMyMealLocal(
  userUid: string,
  meal: Meal
): Promise<void> {
  const now = new Date().toISOString();
  const docId = meal.mealId ?? meal.cloudId!;
  const next: any = {
    ...meal,
    mealId: docId,
    cloudId: docId,
    updatedAt: now,
    createdAt: meal.createdAt ?? now,
  };
  if (isLocalPhoto(meal.photoUrl)) {
    next.uploadState = "pending";
    next.localPhotoUri = meal.photoUrl;
    next.photoUrl = null;
  } else {
    next.uploadState = "done";
    next.localPhotoUri = null;
  }
  const b = writeBatch(db);
  b.set(doc(db, USERS, userUid, MY_MEALS, docId), next, { merge: true });
  await b.commit();
}

export async function fetchMyMealsFromCloud(userUid: string): Promise<Meal[]> {
  const snap = await getDocs(collection(db, USERS, userUid, MY_MEALS));
  return snap.docs.map((d: any) => {
    const data = d.data() as Meal & {
      uploadState?: "pending" | "done";
      localPhotoUri?: string | null;
    };
    return { ...data, cloudId: d.id, mealId: (data as any).mealId ?? d.id };
  });
}

export async function upsertMyMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const docId = meal.mealId ?? meal.cloudId!;
  let photoUrl: string | null = meal.photoUrl ?? null;
  const effectivePhoto = photoUri ?? meal.photoUrl ?? null;
  const uploaded = await uploadPhotoIfNeeded(userUid, docId, effectivePhoto);
  if (uploaded) photoUrl = uploaded;

  const next: any = {
    ...meal,
    mealId: docId,
    cloudId: docId,
    updatedAt: now,
    createdAt: meal.createdAt ?? now,
    photoUrl: photoUrl,
    uploadState: uploaded
      ? "done"
      : isLocalPhoto(effectivePhoto)
      ? "pending"
      : "done",
    localPhotoUri: uploaded
      ? null
      : isLocalPhoto(effectivePhoto)
      ? effectivePhoto
      : null,
  };

  const b = writeBatch(db);
  b.set(doc(db, USERS, userUid, MY_MEALS, docId), next, { merge: true });
  await b.commit();
}

export async function deleteMyMealInFirestore(
  userUid: string,
  cloudId: string
): Promise<void> {
  await setDoc(
    doc(db, USERS, userUid, MY_MEALS, cloudId),
    { deleted: true, updatedAt: new Date().toISOString(), syncState: "synced" },
    { merge: true }
  );
}

export async function syncMyMeals(_userUid: string): Promise<void> {
  return;
}
