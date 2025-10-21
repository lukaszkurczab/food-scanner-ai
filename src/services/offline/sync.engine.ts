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
import { emit } from "@/services/events";

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
    console.log("[sync] run start", { uid });
    const net = await NetInfo.fetch();
    console.log("[sync] net state", { isConnected: net.isConnected });
    if (!net.isConnected) {
      log.log("loop:offline");
      console.log("[sync] abort run offline");
      return;
    }
    if (running) {
      log.log("loop:busy");
      console.log("[sync] abort run busy");
      return;
    }
    running = true;
    try {
      console.log("[sync] processImageUploads");
      await processImageUploads(uid);
      console.log("[sync] pushQueue");
      await pushQueue(uid);
      console.log("[sync] pullChanges");
      await pullChanges(uid);
      console.log("[sync] run done");
    } catch (e: any) {
      log.error("loop:error", e?.message || e);
      console.log("[sync] run error", e?.message || e);
    } finally {
      running = false;
    }
  };

  loopTimer = setInterval(run, LOOP_INTERVAL_MS);

  netUnsub = NetInfo.addEventListener((state) => {
    console.log("[sync] net event", { isConnected: state.isConnected });
    if (state.isConnected) {
      log.log("net:online→run");
      void run();
    }
  });

  log.log("loop:started");
  console.log("[sync] loop started");
  void run();
}

export function stopSyncLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
    console.log("[sync] loop timer cleared");
  }
  if (netUnsub) {
    netUnsub();
    netUnsub = null;
    console.log("[sync] net unsubscribed");
  }
}

export async function pushQueue(uid: string): Promise<void> {
  const pushLog = log.child("push");
  const net = await NetInfo.fetch();
  console.log("[push] start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    pushLog.log("skip:offline");
    console.log("[push] skip offline");
    return;
  }
  pushLog.time("exec");
  let processed = 0;

  while (true) {
    const batch = await nextBatch(PUSH_BATCH_SIZE);
    console.log("[push] nextBatch", { size: batch.length });
    if (batch.length === 0) break;

    for (const op of batch) {
      console.log("[push] op", { id: op.id, kind: op.kind });
      try {
        if (op.kind === "upsert") {
          const payload = op.payload as Meal;
          const id = (payload as any).cloudId || payload.mealId;
          const ref = doc(db, "users", uid, "meals", id);
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
          console.log("[push] upsert compare", {
            id,
            localUpdated,
            remoteUpdated,
            hasRemote: !!remote,
          });

          if (!remote || localUpdated >= remoteUpdated) {
            await setDoc(ref, payload as any, { merge: true });
            pushLog.log("upsert:ok", id);
            console.log("[push] upsert ok", { id });
            emit("meal:pushed", { uid, cloudId: id });
          } else {
            pushLog.warn("upsert:skip:LWW_remote_newer", id);
            console.log("[push] upsert skip newer remote", { id });
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
          console.log("[push] delete compare", {
            id: op.cloud_id,
            localUpdated,
            remoteUpdated,
            hasRemote: !!remote,
          });

          if (!remote || localUpdated >= remoteUpdated) {
            await setDoc(
              ref,
              { deleted: true, updatedAt: op.updated_at } as any,
              { merge: true }
            );
            pushLog.log("delete:ok", op.cloud_id);
            console.log("[push] delete ok", { id: op.cloud_id });
            emit("meal:pushed", { uid, cloudId: op.cloud_id });
          } else {
            pushLog.warn("delete:skip:LWW_remote_newer", op.cloud_id);
            console.log("[push] delete skip newer remote", { id: op.cloud_id });
          }
        } else if (op.kind === "upsert_mymeal") {
          const payload = op.payload as Meal;
          const docId = (payload as any).mealId || payload.cloudId;
          if (!docId) throw new Error("mymeal/missing-id");
          const ref = doc(db, "users", uid, "myMeals", docId);
          await setDoc(
            ref,
            {
              ...payload,
              mealId: docId,
              cloudId: docId,
              source: payload.source ?? "saved",
              updatedAt: payload.updatedAt || nowISO(),
            } as any,
            { merge: true }
          );
          pushLog.log("mymeal:upsert", docId);
          console.log("[push] mymeal upsert", { docId });
        } else if (op.kind === "delete_mymeal") {
          const ref = doc(db, "users", uid, "myMeals", op.cloud_id);
          await setDoc(
            ref,
            { deleted: true, updatedAt: op.updated_at },
            { merge: true }
          );
          pushLog.log("mymeal:delete", op.cloud_id);
          console.log("[push] mymeal delete", { id: op.cloud_id });
        } else {
          pushLog.warn("unknown_op", op.kind);
          console.log("[push] unknown op", { id: op.id, kind: op.kind });
        }

        await markDone(op.id);
        processed++;
        console.log("[push] markDone", { id: op.id });
      } catch (e: any) {
        pushLog.error("op:fail", op.id, e?.message || e);
        console.log("[push] op fail", {
          id: op.id,
          err: e?.message || String(e),
        });
        await bumpAttempts(op.id);
        console.log("[push] bumpAttempts", { id: op.id });
        emit("meal:failed", { uid, opId: op.id });
      }
    }

    if (batch.length < PUSH_BATCH_SIZE) break;
  }

  pushLog.timeEnd("exec");
  pushLog.log("done", { processed });
  console.log("[push] done", { processed });
}

export async function pullChanges(uid: string): Promise<void> {
  const pullLog = log.child("pull");
  const net = await NetInfo.fetch();
  console.log("[pull] start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    pullLog.log("skip:offline");
    console.log("[pull] skip offline");
    return;
  }

  pullLog.time("exec");

  const last = (await getLastPullTs(uid)) || "1970-01-01T00:00:00.000Z";
  let cursor: any = null;
  let maxUpdated = last;
  let total = 0;
  console.log("[pull] since", { last });

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
    console.log("[pull] page", { size: snap.size });
    if (snap.empty) break;

    for (const d of snap.docs) {
      const meal = d.data() as Meal;
      (meal as any).cloudId = d.id;
      try {
        await upsertMealLocal(meal);
        emit("meal:synced", {
          uid,
          cloudId: meal.cloudId,
          updatedAt: meal.updatedAt,
        });
        total++;
        if (meal.updatedAt && meal.updatedAt > maxUpdated)
          maxUpdated = meal.updatedAt;
        console.log("[pull] upsert local ok", {
          id: d.id,
          updatedAt: meal.updatedAt,
        });
      } catch (e: any) {
        pullLog.error("local_upsert:fail", d.id, e?.message || e);
        console.log("[pull] upsert local fail", {
          id: d.id,
          err: e?.message || String(e),
        });
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PULL_PAGE_SIZE) break;
  }

  if (maxUpdated > last) {
    await setLastPullTs(uid, maxUpdated);
    console.log("[pull] set last ts", { maxUpdated });
  }
  pullLog.timeEnd("exec");
  pullLog.log("done", { items: total, last_ts: maxUpdated });
  console.log("[pull] done", { items: total, last_ts: maxUpdated });
}

export async function processImageUploads(uid: string): Promise<void> {
  const upLog = log.child("upload");
  const net = await NetInfo.fetch();
  console.log("[upload] start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    upLog.log("skip:offline");
    console.log("[upload] skip offline");
    return;
  }

  upLog.time("exec");
  const pending = await getPendingUploads(uid);
  console.log("[upload] pending", { count: pending.length });
  if (!pending.length) {
    upLog.timeEnd("exec");
    upLog.log("none");
    console.log("[upload] none");
    return;
  }

  const sql = getDB();
  let ok = 0;
  let fail = 0;

  for (const row of pending) {
    try {
      console.log("[upload] process", {
        image_id: row.image_id,
        local_path: row.local_path,
      });
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
        console.log("[upload] meal enqueued", { cloud_id: m.cloud_id });
      }
      ok++;
    } catch (e: any) {
      fail++;
      upLog.error("upload:fail", row.image_id, e?.message || e);
      console.log("[upload] fail", {
        image_id: row.image_id,
        err: e?.message || String(e),
      });
    }
  }

  upLog.timeEnd("exec");
  upLog.log("done", { ok, fail, pending: pending.length });
  console.log("[upload] done", { ok, fail, pending: pending.length });
}

function safeParseJSON(s: any) {
  try {
    if (typeof s !== "string") return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}
