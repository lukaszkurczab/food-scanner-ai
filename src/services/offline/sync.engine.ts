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
  type FirebaseFirestoreTypes,
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
import {
  createServiceError,
  normalizeServiceError,
} from "@/services/contracts/serviceError";

const log = Sync;

const app = getApp();
const db = getFirestore(app);

const PULL_PAGE_SIZE = 100;
const PUSH_BATCH_SIZE = 25;
const LOOP_INTERVAL_MS = 5 * 60 * 1000;

let loopTimer: ReturnType<typeof setInterval> | null = null;
let netUnsub: null | (() => void) = null;
let running = false;

type MealPayload = Partial<Meal> & { cloudId?: string | null; mealId?: string | null };

function syncEngineError(
  code: string,
  options?: { message?: string; retryable?: boolean; cause?: unknown }
) {
  return createServiceError({
    code,
    source: "SyncEngine",
    retryable: options?.retryable ?? true,
    message: options?.message,
    cause: options?.cause,
  });
}

function toSyncError(error: unknown) {
  return normalizeServiceError(error, {
    code: "sync/unknown",
    source: "SyncEngine",
    retryable: true,
  });
}

function toMealPayload(payload: unknown): MealPayload | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as MealPayload;
}

function toMealSource(value: string | null): Meal["source"] {
  return value === "ai" || value === "manual" || value === "saved" ? value : null;
}

function toMealType(value: string): Meal["type"] {
  return value === "breakfast" ||
    value === "lunch" ||
    value === "dinner" ||
    value === "snack" ||
    value === "other"
    ? value
    : "other";
}

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
    const loopLog = log.child("loop");
    loopLog.log("run:start", { uid });
    const net = await NetInfo.fetch();
    loopLog.log("net:state", { isConnected: net.isConnected });
    if (!net.isConnected) {
      loopLog.log("skip:offline");
      return;
    }
    if (running) {
      loopLog.log("skip:busy");
      return;
    }
    running = true;
    try {
      await processImageUploads(uid);
      await pushQueue(uid);
      await pullChanges(uid);
      loopLog.log("run:done");
    } catch (e: unknown) {
      const err = toSyncError(e);
      loopLog.error("run:error", {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      });
    } finally {
      running = false;
    }
  };

  loopTimer = setInterval(run, LOOP_INTERVAL_MS);

  netUnsub = NetInfo.addEventListener((state) => {
    log.log("net:event", { isConnected: state.isConnected });
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
    log.log("loop:timer_cleared");
  }
  if (netUnsub) {
    netUnsub();
    netUnsub = null;
    log.log("net:unsubscribed");
  }
}

export async function pushQueue(uid: string): Promise<void> {
  const pushLog = log.child("push");
  const net = await NetInfo.fetch();
  pushLog.log("start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    pushLog.log("skip:offline");
    return;
  }
  pushLog.time("exec");
  let processed = 0;

  for (;;) {
    const batch = await nextBatch(PUSH_BATCH_SIZE);
    pushLog.log("batch:next", { size: batch.length });
    if (batch.length === 0) break;

    for (const op of batch) {
      pushLog.log("op:start", { id: op.id, kind: op.kind });
      try {
        if (op.kind === "upsert") {
          const payload = toMealPayload(op.payload);
          const id = payload?.cloudId || payload?.mealId;
          if (!payload || !id) {
            throw syncEngineError("sync/upsert-missing-id", {
              message: "Missing payload or meal identifier for upsert op",
              retryable: false,
            });
          }
          const ref = doc(db, "users", uid, "meals", id);
          const remoteSnap = await getDoc(ref);
          const remote = remoteSnap.exists()
            ? (remoteSnap.data() as Partial<Meal>)
            : null;
          const localUpdated = new Date(
            payload.updatedAt || "1970-01-01"
          ).getTime();
          const remoteUpdated = new Date(
            remote?.updatedAt || "1970-01-01"
          ).getTime();
          pushLog.log("upsert:compare", {
            id,
            localUpdated,
            remoteUpdated,
            hasRemote: !!remote,
          });

          if (!remote || localUpdated >= remoteUpdated) {
            await setDoc(ref, payload, { merge: true });
            pushLog.log("upsert:ok", id);
            emit("meal:pushed", { uid, cloudId: id });
          } else {
            pushLog.warn("upsert:skip:LWW_remote_newer", id);
          }
        } else if (op.kind === "delete") {
          const ref = doc(db, "users", uid, "meals", op.cloud_id);
          const remoteSnap = await getDoc(ref);
          const remote = remoteSnap.exists()
            ? (remoteSnap.data() as Partial<Meal>)
            : null;
          const localUpdated = new Date(op.updated_at).getTime();
          const remoteUpdated = new Date(
            remote?.updatedAt || "1970-01-01"
          ).getTime();
          pushLog.log("delete:compare", {
            id: op.cloud_id,
            localUpdated,
            remoteUpdated,
            hasRemote: !!remote,
          });

          if (!remote || localUpdated >= remoteUpdated) {
            await setDoc(
              ref,
              { deleted: true, updatedAt: op.updated_at },
              { merge: true }
            );
            pushLog.log("delete:ok", op.cloud_id);
            emit("meal:pushed", { uid, cloudId: op.cloud_id });
          } else {
            pushLog.warn("delete:skip:LWW_remote_newer", op.cloud_id);
          }
        } else if (op.kind === "upsert_mymeal") {
          const payload = toMealPayload(op.payload);
          const docId = payload?.mealId || payload?.cloudId;
          if (!docId) {
            throw syncEngineError("sync/mymeal-missing-id", {
              message: "Missing meal identifier for myMeal upsert op",
              retryable: false,
            });
          }
          const ref = doc(db, "users", uid, "myMeals", docId);
          await setDoc(
            ref,
            {
              ...payload,
              mealId: docId,
              cloudId: docId,
              source: payload.source ?? "saved",
              updatedAt: payload.updatedAt || nowISO(),
            },
            { merge: true }
          );
          pushLog.log("mymeal:upsert", docId);
        } else if (op.kind === "delete_mymeal") {
          const ref = doc(db, "users", uid, "myMeals", op.cloud_id);
          await setDoc(
            ref,
            { deleted: true, updatedAt: op.updated_at },
            { merge: true }
          );
          pushLog.log("mymeal:delete", op.cloud_id);
        } else {
          pushLog.warn("unknown_op", op.kind);
        }

        await markDone(op.id);
        processed++;
        pushLog.log("op:done", { id: op.id });
      } catch (e: unknown) {
        const err = toSyncError(e);
        pushLog.error("op:fail", {
          id: op.id,
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        });
        await bumpAttempts(op.id);
        pushLog.log("op:bump_attempts", { id: op.id });
        emit("meal:failed", { uid, opId: op.id });
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
  pullLog.log("start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    pullLog.log("skip:offline");
    return;
  }

  pullLog.time("exec");

  const last = (await getLastPullTs(uid)) || "1970-01-01T00:00:00.000Z";
  let cursor: FirebaseFirestoreTypes.QueryDocumentSnapshot<Meal> | null = null;
  let maxUpdated = last;
  let total = 0;
  pullLog.log("since", { last });

  const base = query(
    mealsCol(uid),
    where("updatedAt", ">", last),
    orderBy("updatedAt", "asc")
  );

  for (;;) {
    const pullQuery = (
      cursor
        ? query(base, startAfter(cursor), fsLimit(PULL_PAGE_SIZE))
        : query(base, fsLimit(PULL_PAGE_SIZE))
    ) as FirebaseFirestoreTypes.Query<Meal>;
    const snap = await getDocs(pullQuery);
    pullLog.log("page", { size: snap.size });
    if (snap.empty) break;

    for (const d of snap.docs) {
      const meal: Meal = { ...(d.data() as Meal), cloudId: d.id };
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
        pullLog.log("local_upsert:ok", {
          id: d.id,
          updatedAt: meal.updatedAt,
        });
      } catch (e: unknown) {
        const err = toSyncError(e);
        pullLog.error("local_upsert:fail", {
          id: d.id,
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        });
      }
    }

    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PULL_PAGE_SIZE) break;
  }

  if (maxUpdated > last) {
    await setLastPullTs(uid, maxUpdated);
    pullLog.log("set_last_ts", { maxUpdated });
  }
  pullLog.timeEnd("exec");
  pullLog.log("done", { items: total, last_ts: maxUpdated });
}

export async function processImageUploads(uid: string): Promise<void> {
  const upLog = log.child("upload");
  const net = await NetInfo.fetch();
  upLog.log("start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    upLog.log("skip:offline");
    return;
  }

  upLog.time("exec");
  const pending = await getPendingUploads(uid);
  upLog.log("pending", { count: pending.length });
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
      upLog.log("process", {
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
          type: toMealType(m.type),
          name: m.name,
          ingredients: [],
          createdAt: m.created_at ?? m.timestamp ?? now,
          updatedAt: now,
          syncState: "pending",
          source: toMealSource(m.source) ?? "manual",
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
        };

        await enqueueUpsert(uid, normalized);
        upLog.log("meal_enqueued", m.cloud_id);
      }
      ok++;
    } catch (e: unknown) {
      fail++;
      const err = toSyncError(e);
      upLog.error("upload:fail", {
        image_id: row.image_id,
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      });
    }
  }

  upLog.timeEnd("exec");
  upLog.log("done", { ok, fail, pending: pending.length });
}

function safeParseJSON(s: unknown) {
  try {
    if (typeof s !== "string") return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}
