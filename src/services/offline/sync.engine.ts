import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Meal } from "@/types/meal";
import { Sync } from "@/utils/debug";
import { nextBatch, markDone, bumpAttempts, enqueueUpsert } from "./queue.repo";
import { setChatMessageSyncState } from "./chat.repo";
import { getPendingUploads, markUploaded } from "./images.repo";
import { upsertMealLocal } from "./meals.repo";
import { upsertMyMealLocal } from "./myMeals.repo";
import { getDB } from "./db";
import { processAndUpload } from "@/services/meals/mealService.images";
import type { MealRow } from "./types";
import { emit } from "@/services/core/events";
import { post } from "@/services/core/apiClient";
import {
  buildMealUpdatedCursor,
  fetchMealChangesRemote,
  markMealDeletedRemote,
  saveMealRemote,
} from "@/services/meals/mealsRepository";
import {
  buildMyMealUpdatedCursor,
  fetchMyMealChangesRemote,
  markMyMealDeletedRemote,
  updateMyMealRemote,
  uploadMyMealPhotoRemote,
} from "@/services/meals/myMealsRepository";
import {
  createServiceError,
  normalizeServiceError,
} from "@/services/contracts/serviceError";

const log = Sync;

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

function nowISO() {
  return new Date().toISOString();
}

function keyLastPull(uid: string) {
  return `sync:last_pull_ts:${uid}`;
}

function keyLastMyMealsPull(uid: string) {
  return `sync:last_pull_my_meals:${uid}`;
}

export async function setLastPullTs(uid: string, iso: string): Promise<void> {
  await AsyncStorage.setItem(keyLastPull(uid), iso);
}

export async function getLastPullTs(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(keyLastPull(uid));
}

export async function setLastMyMealsPullTs(
  uid: string,
  iso: string,
): Promise<void> {
  await AsyncStorage.setItem(keyLastMyMealsPull(uid), iso);
}

export async function getLastMyMealsPullTs(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(keyLastMyMealsPull(uid));
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
      await pullMyMealChanges(uid);
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
          await saveMealRemote({
            uid,
            meal: {
              ...(payload as Meal),
              cloudId: id,
              mealId: String(payload.mealId || id),
              userUid: String(payload.userUid || uid),
              timestamp: String(payload.timestamp || payload.updatedAt || nowISO()),
              type: toMealType(String(payload.type || "other")),
              name: payload.name ?? null,
              ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : [],
              createdAt: String(
                payload.createdAt || payload.timestamp || payload.updatedAt || nowISO()
              ),
              updatedAt: String(payload.updatedAt || nowISO()),
              syncState: "pending",
              source: toMealSource(
                typeof payload.source === "string" ? payload.source : null
              ),
              imageId: payload.imageId ?? null,
              photoUrl: payload.photoUrl ?? null,
              notes: payload.notes ?? null,
              tags: Array.isArray(payload.tags) ? payload.tags : [],
              deleted: Boolean(payload.deleted),
              totals:
                payload.totals && typeof payload.totals === "object"
                  ? payload.totals
                  : { kcal: 0, protein: 0, carbs: 0, fat: 0 },
            },
          });
          pushLog.log("upsert:ok", id);
          emit("meal:pushed", { uid, cloudId: id });
        } else if (op.kind === "delete") {
          await markMealDeletedRemote(uid, op.cloud_id, op.updated_at);
          pushLog.log("delete:ok", op.cloud_id);
          emit("meal:pushed", { uid, cloudId: op.cloud_id });
        } else if (op.kind === "upsert_mymeal") {
          const payload = toMealPayload(op.payload);
          const docId = payload?.mealId || payload?.cloudId;
          if (!docId) {
            throw syncEngineError("sync/mymeal-missing-id", {
              message: "Missing meal identifier for myMeal upsert op",
              retryable: false,
            });
          }
          const localPhotoPath =
            (typeof payload?.photoLocalPath === "string" && payload.photoLocalPath) ||
            (typeof payload?.photoUrl === "string" && isLocalUri(payload.photoUrl)
              ? payload.photoUrl
              : null);
          let imageId: string | null =
            typeof payload?.imageId === "string" ? payload.imageId : null;
          let photoUrl: string | null =
            typeof payload?.photoUrl === "string" && !isLocalUri(payload.photoUrl)
              ? payload.photoUrl
              : null;

          if (localPhotoPath) {
            const uploaded = await uploadMyMealPhotoRemote(uid, docId, localPhotoPath);
            imageId = uploaded.imageId;
            photoUrl = uploaded.photoUrl;
          }

          await updateMyMealRemote(uid, docId, {
            ...payload,
            mealId: docId,
            cloudId: docId,
            source: "saved",
            updatedAt: payload.updatedAt || nowISO(),
            imageId,
            photoUrl,
          });
          await upsertMyMealLocal({
            userUid: String(payload?.userUid || uid),
            mealId: docId,
            cloudId: docId,
            timestamp: String(payload?.timestamp || payload?.updatedAt || nowISO()),
            type: toMealType(String(payload?.type || "other")),
            name: typeof payload?.name === "string" ? payload.name : null,
            ingredients: Array.isArray(payload?.ingredients) ? payload.ingredients : [],
            createdAt: String(
              payload?.createdAt || payload?.timestamp || payload?.updatedAt || nowISO()
            ),
            updatedAt: String(payload?.updatedAt || nowISO()),
            syncState: "synced",
            source: "saved",
            imageId,
            photoUrl: localPhotoPath || photoUrl,
            photoLocalPath: localPhotoPath,
            notes: typeof payload?.notes === "string" ? payload.notes : null,
            tags: Array.isArray(payload?.tags) ? payload.tags : [],
            deleted: Boolean(payload?.deleted),
            totals:
              payload?.totals && typeof payload.totals === "object"
                ? payload.totals
                : { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          });
          pushLog.log("mymeal:upsert", docId);
          emit("mymeal:synced", { uid, cloudId: docId });
        } else if (op.kind === "delete_mymeal") {
          await markMyMealDeletedRemote(uid, op.cloud_id, op.updated_at);
          pushLog.log("mymeal:delete", op.cloud_id);
          emit("mymeal:synced", { uid, cloudId: op.cloud_id });
        } else if (op.kind === "persist_chat_message") {
          const payload = op.payload as {
            threadId?: string;
            messageId?: string;
            role?: "user" | "assistant" | "system";
            content?: string;
            createdAt?: number;
            title?: string;
          } | null;
          if (
            !payload?.threadId ||
            !payload.messageId ||
            !payload.role ||
            typeof payload.content !== "string" ||
            typeof payload.createdAt !== "number"
          ) {
            throw syncEngineError("sync/chat-message-invalid-payload", {
              message: "Missing fields for chat message persist op",
              retryable: false,
            });
          }

          await post(
            `/users/me/chat/threads/${payload.threadId}/messages`,
            {
              messageId: payload.messageId,
              role: payload.role,
              content: payload.content,
              createdAt: payload.createdAt,
              title: payload.title,
            }
          );
          await setChatMessageSyncState({
            userUid: uid,
            threadId: payload.threadId,
            messageId: payload.messageId,
            syncState: "synced",
            lastSyncedAt: payload.createdAt,
          });
          emit("chat:pushed", {
            uid,
            threadId: payload.threadId,
            messageId: payload.messageId,
          });
          pushLog.log("chat:persist", {
            threadId: payload.threadId,
            messageId: payload.messageId,
          });
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
        if (op.kind === "persist_chat_message") {
          emit("chat:failed", { uid, opId: op.id });
        } else {
          emit("meal:failed", { uid, opId: op.id });
        }
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
  let cursor: string | null = last;
  let latestCursor = last;
  let total = 0;
  pullLog.log("since", { last });

  for (;;) {
    const page = await fetchMealChangesRemote({
      uid,
      pageSize: PULL_PAGE_SIZE,
      cursor,
    });
    pullLog.log("page", { size: page.items.length });
    if (!page.items.length) break;

    for (const meal of page.items) {
      try {
        await upsertMealLocal(meal);
        emit("meal:synced", {
          uid,
          cloudId: meal.cloudId,
          updatedAt: meal.updatedAt,
        });
        total++;
        latestCursor = buildMealUpdatedCursor(meal);
        pullLog.log("local_upsert:ok", {
          id: meal.cloudId,
          updatedAt: meal.updatedAt,
        });
      } catch (e: unknown) {
        const err = toSyncError(e);
        pullLog.error("local_upsert:fail", {
          id: meal.cloudId,
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        });
      }
    }

    cursor = page.nextCursor || latestCursor;
    if (!page.nextCursor) break;
  }

  if (latestCursor !== last) {
    await setLastPullTs(uid, latestCursor);
    pullLog.log("set_last_ts", { latestCursor });
  }
  pullLog.timeEnd("exec");
  pullLog.log("done", { items: total, last_ts: latestCursor });
}

export async function pullMyMealChanges(uid: string): Promise<void> {
  const pullLog = log.child("pull:mymeals");
  const net = await NetInfo.fetch();
  pullLog.log("start", { uid, isConnected: net.isConnected });
  if (!net.isConnected) {
    pullLog.log("skip:offline");
    return;
  }

  const last = (await getLastMyMealsPullTs(uid)) || "1970-01-01T00:00:00.000Z";
  let cursor: string | null = last;
  let latestCursor = last;
  let total = 0;

  for (;;) {
    const page = await fetchMyMealChangesRemote({
      uid,
      pageSize: PULL_PAGE_SIZE,
      cursor,
    });
    pullLog.log("page", { size: page.items.length });
    if (!page.items.length) break;

    for (const meal of page.items) {
      try {
        await upsertMyMealLocal({
          ...meal,
          source: "saved",
          photoLocalPath: meal.photoLocalPath ?? null,
        });
        emit("mymeal:synced", {
          uid,
          cloudId: meal.cloudId,
          updatedAt: meal.updatedAt,
        });
        total++;
        latestCursor = buildMyMealUpdatedCursor(meal);
      } catch (e: unknown) {
        const err = toSyncError(e);
        pullLog.error("local_upsert:fail", {
          id: meal.cloudId,
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        });
      }
    }

    cursor = page.nextCursor || latestCursor;
    if (!page.nextCursor) break;
  }

  if (latestCursor !== last) {
    await setLastMyMealsPullTs(uid, latestCursor);
    pullLog.log("set_last_ts", { latestCursor });
  }
  pullLog.log("done", { items: total, last_ts: latestCursor });
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

function isLocalUri(value?: string | null): value is string {
  if (!value || typeof value !== "string") return false;
  return value.startsWith("file:") || value.startsWith("content:");
}
