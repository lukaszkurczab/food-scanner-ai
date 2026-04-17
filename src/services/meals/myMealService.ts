import NetInfo from "@react-native-community/netinfo";
import type { Meal } from "@/types/meal";
import { emit } from "@/services/core/events";
import { isOfflineNetState } from "@/services/core/networkState";
import {
  enqueueMyMealDelete,
  enqueueMyMealUpsert,
} from "@/services/offline/queue.repo";
import {
  markDeletedMyMealLocal,
  upsertMyMealLocal as upsertMyMealLocalRepo,
} from "@/services/offline/myMeals.repo";
import { pullMyMealChanges, pushQueue } from "@/services/offline/sync.engine";

type MyMealDoc = Meal & {
  uploadState?: "pending" | "done";
  localPhotoUri?: string | null;
};

const isLocalPhoto = (uri?: string | null) =>
  !!uri && (uri.startsWith("file:") || uri.startsWith("content:"));
const myMealSyncTasks = new Map<string, Promise<void>>();
const myMealSyncPending = new Set<string>();

async function runMyMealSync(uid: string): Promise<void> {
  for (;;) {
    myMealSyncPending.delete(uid);
    await pushQueue(uid);
    await pullMyMealChanges(uid);
    if (!myMealSyncPending.has(uid)) {
      return;
    }
  }
}

async function requestMyMealSync(uid: string): Promise<void> {
  const existing = myMealSyncTasks.get(uid);
  if (existing) {
    myMealSyncPending.add(uid);
    return existing;
  }

  const task = runMyMealSync(uid).finally(() => {
    if (myMealSyncTasks.get(uid) === task) {
      myMealSyncTasks.delete(uid);
    }
    myMealSyncPending.delete(uid);
  });
  myMealSyncTasks.set(uid, task);
  return task;
}

export async function upsertMyMealLocal(
  userUid: string,
  meal: Meal,
): Promise<void> {
  const now = new Date().toISOString();
  const docId = meal.mealId ?? meal.cloudId!;
  const localPath = meal.photoLocalPath ?? (isLocalPhoto(meal.photoUrl) ? meal.photoUrl : null);
  const next: Meal = {
    ...meal,
    userUid,
    mealId: docId,
    cloudId: docId,
    updatedAt: now,
    createdAt: meal.createdAt ?? now,
    source: "saved",
    syncState: "pending",
    photoLocalPath: localPath,
    photoUrl: localPath ?? meal.photoUrl ?? null,
  };
  await upsertMyMealLocalRepo(next);
}

export async function upsertMyMealWithPhoto(
  userUid: string,
  meal: Meal,
  photoUri: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const docId = meal.mealId ?? meal.cloudId!;
  const effectivePhoto = photoUri ?? meal.photoLocalPath ?? meal.photoUrl ?? null;
  const next: MyMealDoc = {
    ...meal,
    userUid,
    mealId: docId,
    cloudId: docId,
    updatedAt: now,
    createdAt: meal.createdAt ?? now,
    source: "saved",
    syncState: "pending",
    photoLocalPath: isLocalPhoto(effectivePhoto) ? effectivePhoto : meal.photoLocalPath ?? null,
    photoUrl: effectivePhoto,
    uploadState: isLocalPhoto(effectivePhoto) ? "pending" : "done",
    localPhotoUri: isLocalPhoto(effectivePhoto) ? effectivePhoto : null,
  };

  await upsertMyMealLocalRepo(next);
  await enqueueMyMealUpsert(userUid, next);
  emit("mymeal:updated", { uid: userUid, cloudId: docId });

  const net = await NetInfo.fetch();
  if (!isOfflineNetState(net)) {
    await requestMyMealSync(userUid);
  }
}

export async function deleteMyMeal(
  userUid: string,
  cloudId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await markDeletedMyMealLocal(cloudId, now);
  await enqueueMyMealDelete(userUid, cloudId, now);

  const net = await NetInfo.fetch();
  if (!isOfflineNetState(net)) {
    await requestMyMealSync(userUid);
  }
}

export async function syncMyMeals(userUid?: string | null): Promise<void> {
  if (!userUid) return;
  await requestMyMealSync(userUid);
}
