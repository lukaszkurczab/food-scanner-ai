import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
  startAfter,
} from "@react-native-firebase/firestore";

import type { Meal } from "@/types/meal";
import { Sync } from "@/utils/debug";
import { nextBatch, markDone, bumpAttempts, enqueueUpsert } from "./queue.repo";
import { getPendingUploads, markUploaded } from "./images.repo";
import { upsertMealLocal } from "./meals.repo";
import { getDB } from "./db";
import { processAndUpload } from "@/services/mealService.images";
import type { MealRow } from "./types";

const log = Sync;

const app = getApp();
const db = getFirestore(app);

const PULL_PAGE_SIZE = 100;
const PUSH_BATCH_SIZE = 25;
const LOOP_INTERVAL_MS = 5 * 60 * 1000;

let loopTimer: any = null;
let netUnsub: null | (() => void) = null;
let running = false;

function mealsCol(uid: string) {
  return collection(db, "users", uid, "meals");
}

function nowISO() {
  return new Date().toISOString();
}

function keyLastPull(uid: string) {
  return `sync:last_pull_ts:${uid}`;
}

export async function setLastPullTs(uid: string, iso: string): Promise<void> {
  await AsyncStorage.setItem(keyLastPull(uid), iso);
}

export async function getLastPullTs(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(keyLastPull(uid));
}

export function startSyncLoop(uid: string) {
  if (!uid) return;
  stopSyncLoop();

  const run = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      log.log("loop:offline");
      return;
    }
    if (running) {
      log.log("loop:busy");
      return;
    }
    running = true;
    try {
      await processImageUploads(uid);
      await pushQueue(uid);
      await pullChanges(uid);
    } catch (e: any) {
      log.error("loop:error", e?.message || e);
    } finally {
      running = false;
    }
  };

  loopTimer = setInterval(run, LOOP_INTERVAL_MS);

  netUnsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      log.log("net:online→run");
      void run();
    }
  });

  log.log("loop:started");
  void run();
}

export function stopSyncLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  if (netUnsub) {
    netUnsub();
    netUnsub = null;
  }
}

export async function pushQueue(uid: string): Promise<void> {
  const pushLog = log.child("push");
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    pushLog.log("skip:offline");
    return;
  }
  pushLog.time("exec");
  let processed = 0;

  while (true) {
    const batch = await nextBatch(PUSH_BATCH_SIZE);
    if (batch.length === 0) break;

    for (const op of batch) {
      try {
        if (op.kind === "upsert") {
          const payload = op.payload as Meal;
          const ref = doc(
            db,
            "users",
            uid,
            "meals",
            (payload as any).cloudId || payload.mealId
          );
          const remoteSnap = await getDoc(ref);
          const remote = remoteSnap.exists()
            ? (remoteSnap.data() as any)
            : null;

          const localUpdated = new Date(
            payload.updatedAt || "1970-01-01"
          ).getTime();
          const remoteUpdated = new Date(
            remote?.updatedAt || "1970-01-01"
          ).getTime();

          if (!remote || localUpdated >= remoteUpdated) {
            await setDoc(ref, payload as any, { merge: true });
            pushLog.log(
              "upsert:ok",
              (payload as any).cloudId || payload.mealId
            );
          } else {
            pushLog.warn(
              "upsert:skip:LWW_remote_newer",
              (payload as any).cloudId || payload.mealId
            );
          }
        } else if (op.kind === "delete") {
          const ref = doc(db, "users", uid, "meals", op.cloud_id);
          const remoteSnap = await getDoc(ref);
          const remote = remoteSnap.exists()
            ? (remoteSnap.data() as any)
            : null;
          const localUpdated = new Date(op.updated_at).getTime();
          const remoteUpdated = new Date(
            remote?.updatedAt || "1970-01-01"
          ).getTime();

          if (!remote || localUpdated >= remoteUpdated) {
            await setDoc(
              ref,
              { deleted: true, updatedAt: op.updated_at } as any,
              { merge: true }
            );
            pushLog.log("delete:ok", op.cloud_id);
          } else {
            pushLog.warn("delete:skip:LWW_remote_newer", op.cloud_id);
          }
        } else {
          pushLog.warn("unknown_op", op.kind);
        }

        await markDone(op.id);
        processed++;
      } catch (e: any) {
        pushLog.error("op:fail", op.id, e?.message || e);
        await bumpAttempts(op.id);
      }
    }

    if (batch.length < PUSH_BATCH_SIZE) break;
  }

  pushLog.timeEnd("exec");
  pushLog.log("done", { processed });
}

export async function pullChanges(uid: string): Promise<void> {
  const pullLog = log.child("pull");
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    pullLog.log("skip:offline");
    return;
  }

  pullLog.time("exec");

  const last = (await getLastPullTs(uid)) || "1970-01-01T00:00:00.000Z";
  let cursor: any = null;
  let maxUpdated = last;
  let total = 0;

  const base = query(
    mealsCol(uid),
    where("updatedAt", ">", last),
    orderBy("updatedAt", "asc")
  );

  while (true) {
    const q = cursor
      ? query(base, startAfter(cursor), fsLimit(PULL_PAGE_SIZE))
      : query(base, fsLimit(PULL_PAGE_SIZE));
    const snap = await getDocs(q);
    if (snap.empty) break;

    for (const d of snap.docs) {
      const meal = d.data() as Meal;
      (meal as any).cloudId = d.id;
      try {
        await upsertMealLocal(meal);
        total++;
        if (meal.updatedAt && meal.updatedAt > maxUpdated)
          maxUpdated = meal.updatedAt;
      } catch (e: any) {
        pullLog.error("local_upsert:fail", d.id, e?.message || e);
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PULL_PAGE_SIZE) break;
  }

  if (maxUpdated > last) {
    await setLastPullTs(uid, maxUpdated);
  }
  pullLog.timeEnd("exec");
  pullLog.log("done", { items: total, last_ts: maxUpdated });
}

export async function processImageUploads(uid: string): Promise<void> {
  const upLog = log.child("upload");
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    upLog.log("skip:offline");
    return;
  }

  upLog.time("exec");
  const pending = await getPendingUploads(uid);
  if (!pending.length) {
    upLog.timeEnd("exec");
    upLog.log("none");
    return;
  }

  const sql = getDB();
  let ok = 0;
  let fail = 0;

  for (const row of pending) {
    try {
      const up = await processAndUpload(uid, row.local_path);
      await markUploaded(row.image_id, up.cloudUrl);

      const now = nowISO();
      sql.runSync(
        `UPDATE meals
         SET photo_url=?, image_id=?, updated_at=?
         WHERE user_uid=? AND image_local=?`,
        [up.cloudUrl, up.imageId, now, uid, row.local_path]
      );

      const meals = sql.getAllSync(
        `SELECT * FROM meals WHERE user_uid=? AND image_local=?`,
        [uid, row.local_path]
      ) as MealRow[];

      for (const m of meals) {
        const tags = safeParseJSON(m.tags) ?? [];
        const normalized: Meal = {
          userUid: m.user_uid,
          mealId: m.meal_id,
          cloudId: m.cloud_id ?? undefined,
          timestamp: m.timestamp,
          type: m.type,
          name: m.name,
          ingredients: [],
          createdAt: m.created_at ?? m.timestamp ?? now,
          updatedAt: now,
          syncState: "pending",
          source: (m.source as any) ?? "manual",
          imageId: up.imageId,
          photoUrl: up.cloudUrl,
          notes: m.notes,
          tags,
          deleted: Number(m.deleted ?? 0) === 1,
          totals: {
            kcal: m.totals_kcal || 0,
            protein: m.totals_protein || 0,
            carbs: m.totals_carbs || 0,
            fat: m.totals_fat || 0,
          },
        } as any;

        await enqueueUpsert(uid, normalized);
        upLog.log("meal_enqueued", m.cloud_id);
      }
      ok++;
    } catch (e: any) {
      fail++;
      upLog.error("upload:fail", row.image_id, e?.message || e);
    }
  }

  upLog.timeEnd("exec");
  upLog.log("done", { ok, fail, pending: pending.length });
}

function safeParseJSON(s: any) {
  try {
    if (typeof s !== "string") return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}
