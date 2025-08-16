import { createPendingQueue } from "@/utils/syncUtils";
import { database } from "@/db/database";
import { Q } from "@nozbe/watermelondb";

import type { Meal } from "@/types/meal";
import MealModel from "@/db/models/Meal";
import {
  upsertMealWithPhoto,
  deleteMealInFirestore,
} from "@/services/mealService";
import {
  upsertMyMealWithPhoto,
  deleteMyMealInFirestore,
} from "@/services/myMealService";
import MyMealModel from "@/db/models/MyMeal";

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

type MyMealJob =
  | { kind: "upsert"; userUid: string; meal: Meal }
  | { kind: "delete"; userUid: string; cloudId: string };

async function processMyMeal(job: MyMealJob) {
  if (job.kind === "upsert") {
    try {
      console.log("[QUEUE] processMyMeal upsert start", {
        userUid: job.userUid,
        mealId: job.meal.mealId,
        cloudId: job.meal.cloudId,
        hasPhoto: !!job.meal.photoUrl,
      });
      await upsertMyMealWithPhoto(
        job.userUid,
        { ...job.meal, syncState: "synced" },
        job.meal.photoUrl ?? null
      );
      console.log("[QUEUE] processMyMeal upsert done");
    } catch (e: any) {
      console.error(
        "[QUEUE] processMyMeal upsert error",
        e?.message || e,
        e?.stack
      );
      throw e;
    }
  } else {
    try {
      console.log("[QUEUE] processMyMeal delete start", {
        userUid: job.userUid,
        cloudId: job.cloudId,
      });
      await deleteMyMealInFirestore(job.userUid, job.cloudId);
      const c = database.get<MyMealModel>("myMeals");
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
      console.log("[QUEUE] processMyMeal delete done");
    } catch (e: any) {
      console.error(
        "[QUEUE] processMyMeal delete error",
        e?.message || e,
        e?.stack
      );
      throw e;
    }
  }
}

const myMealQueues = new Map<
  string,
  ReturnType<typeof createPendingQueue<MyMealJob>>
>();

export function getMyMealQueue(uid: string) {
  let q = myMealQueues.get(uid);
  if (!q) {
    q = createPendingQueue<MyMealJob>(processMyMeal, { concurrency: 2 });
    myMealQueues.set(uid, q);
  }
  return q!;
}

async function processMeal(job: MealJob) {
  if (job.kind === "upsert") {
    try {
      console.log("[QUEUE] processMeal upsert start", {
        userUid: job.userUid,
        mealId: job.meal.mealId,
        cloudId: job.meal.cloudId,
        hasPhoto: !!job.meal.photoUrl,
      });
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
      } else {
        console.warn("[QUEUE] processMeal upsert: local row not found", {
          userUid: job.userUid,
          cloudId: job.meal.cloudId,
        });
      }
      console.log("[QUEUE] processMeal upsert done");
    } catch (e: any) {
      console.error(
        "[QUEUE] processMeal upsert error(upsertMealWithPhoto)",
        e?.message || e,
        e?.stack
      );
      throw e;
    }
  } else {
    try {
      console.log("[QUEUE] processMeal delete start", {
        userUid: job.userUid,
        cloudId: job.cloudId,
      });
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
      console.log("[QUEUE] processMeal delete done");
    } catch (e: any) {
      console.error(
        "[QUEUE] processMeal delete error",
        e?.message || e,
        e?.stack
      );
      throw e;
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

const attached = new Set<string>();

export function attachQueues(uid: string) {
  if (attached.has(uid)) {
    console.log("[QUEUE] attachQueues skipped", uid);
    return;
  }
  attached.add(uid);
  console.log("[QUEUE] attachQueues", uid);
  getMealQueue(uid).attachOnlineListener();
  getChatQueue(uid).attachOnlineListener();
  getUserQueue(uid).attachOnlineListener();
  getMyMealQueue(uid).attachOnlineListener();

  getMyMealQueue(uid).flush();
  getMealQueue(uid).flush();
  getChatQueue(uid).flush();
  getUserQueue(uid).flush();
}

export function disposeQueues(uid: string) {
  if (!attached.has(uid)) return;
  attached.delete(uid);

  mealQueues.get(uid)?.detachOnlineListener();
  chatQueues.get(uid)?.detachOnlineListener();
  userQueues.get(uid)?.detachOnlineListener();
  myMealQueues.get(uid)?.detachOnlineListener();

  mealQueues.get(uid)?.clear();
  chatQueues.get(uid)?.clear();
  userQueues.get(uid)?.clear();
  myMealQueues.get(uid)?.clear();

  mealQueues.delete(uid);
  chatQueues.delete(uid);
  userQueues.delete(uid);
  myMealQueues.delete(uid);
}
