import { createPendingQueue } from "@/utils/syncUtils";
import { database } from "@/db/database";
import { Q } from "@nozbe/watermelondb";

import type { Meal } from "@/types/meal";
import MealModel from "@/db/models/Meal";
import {
  upsertMealWithPhoto,
  deleteMealInFirestore,
} from "@/services/mealService";

import type { ChatMessage } from "@/types";
import ChatMessageModel from "@/db/models/ChatMessage";
import {
  addChatMessageToFirestore,
  upsertChatMessageInFirestore,
} from "@/services/chatService";

import { syncUserProfile } from "@/services/userService";

type MealJob =
  | { kind: "upsert"; userUid: string; meal: Meal }
  | { kind: "delete"; userUid: string; cloudId: string };

async function processMeal(job: MealJob) {
  if (job.kind === "upsert") {
    await upsertMealWithPhoto(
      job.userUid,
      { ...job.meal, syncState: "synced" },
      job.meal.photoUrl ?? null
    );
    const c = database.get<MealModel>("meals");
    const rows = await c
      .query(
        Q.where("userUid", job.userUid),
        Q.where("cloudId", job.meal.cloudId!)
      )
      .fetch();
    if (rows[0]) {
      await database.write(async () => {
        await rows[0].update((m: any) => {
          m.syncState = "synced";
          m.updatedAt = new Date().toISOString();
        });
      });
    }
  } else {
    await deleteMealInFirestore(job.userUid, job.cloudId);
    const c = database.get<MealModel>("meals");
    const rows = await c
      .query(Q.where("userUid", job.userUid), Q.where("cloudId", job.cloudId))
      .fetch();
    if (rows[0]) {
      await database.write(async () => {
        await rows[0].update((m: any) => {
          m.syncState = "synced";
        });
      });
    }
  }
}

type ChatJob = { kind: "upsert"; userUid: string; message: ChatMessage };

async function processChat(job: ChatJob) {
  const msg = job.message;
  let cloudId = msg.cloudId;

  if (!cloudId) {
    cloudId = await addChatMessageToFirestore({
      ...msg,
      id: "",
      cloudId: undefined,
      lastSyncedAt: Date.now(),
      syncState: "pending",
    });
  } else {
    await upsertChatMessageInFirestore(cloudId, msg);
  }

  const c = database.get<ChatMessageModel>("chatMessages");
  const rows = await c
    .query(
      Q.where("userUid", job.userUid),
      Q.where("createdAt", msg.createdAt),
      Q.where("role", msg.role)
    )
    .fetch();

  const row = rows[0];
  if (row) {
    await database.write(async () => {
      await row.update((m: any) => {
        m.syncState = "synced";
        m.cloudId = cloudId!;
        m.lastSyncedAt = Date.now();
      });
    });
  }
}

type UserJob = { kind: "sync"; userUid: string };

async function processUser(job: UserJob) {
  await syncUserProfile(job.userUid);
}

const mealQueues = new Map<
  string,
  ReturnType<typeof createPendingQueue<MealJob>>
>();
const chatQueues = new Map<
  string,
  ReturnType<typeof createPendingQueue<ChatJob>>
>();
const userQueues = new Map<
  string,
  ReturnType<typeof createPendingQueue<UserJob>>
>();

export function getMealQueue(uid: string) {
  let q = mealQueues.get(uid);
  if (!q) {
    q = createPendingQueue<MealJob>(processMeal, { concurrency: 2 });
    mealQueues.set(uid, q);
  }
  return q!;
}

export function getChatQueue(uid: string) {
  let q = chatQueues.get(uid);
  if (!q) {
    q = createPendingQueue<ChatJob>(processChat, { concurrency: 2 });
    chatQueues.set(uid, q);
  }
  return q!;
}

export function getUserQueue(uid: string) {
  let q = userQueues.get(uid);
  if (!q) {
    q = createPendingQueue<UserJob>(processUser, { concurrency: 1 });
    userQueues.set(uid, q);
  }
  return q!;
}

export function attachQueues(uid: string) {
  getMealQueue(uid).attachOnlineListener();
  getChatQueue(uid).attachOnlineListener();
  getUserQueue(uid).attachOnlineListener();

  getMealQueue(uid).flush();
  getChatQueue(uid).flush();
  getUserQueue(uid).flush();
}

export function disposeQueues(uid: string) {
  mealQueues.get(uid)?.detachOnlineListener();
  chatQueues.get(uid)?.detachOnlineListener();
  userQueues.get(uid)?.detachOnlineListener();

  mealQueues.get(uid)?.clear();
  chatQueues.get(uid)?.clear();
  userQueues.get(uid)?.clear();

  mealQueues.delete(uid);
  chatQueues.delete(uid);
  userQueues.delete(uid);
}
