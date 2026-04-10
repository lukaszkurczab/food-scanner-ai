import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage, ChatThread, UserData } from "@/types";
import type { Meal } from "@/types/meal";
import { Sync } from "@/utils/debug";
import {
  nextBatch,
  markDone,
  bumpAttempts,
  enqueueUpsert,
  moveToDeadLetter,
  MAX_QUEUE_ATTEMPTS,
} from "./queue.repo";
import {
  getChatThreadByIdLocal,
  setChatMessageSyncState,
  upsertChatMessageLocal,
  upsertChatThreadLocal,
} from "./chat.repo";
import { getPendingUploads, markUploaded } from "./images.repo";
import {
  getMealByCloudIdLocal,
  setMealSyncStateLocal,
  upsertMealLocal,
} from "./meals.repo";
import { setMyMealSyncStateLocal, upsertMyMealLocal } from "./myMeals.repo";
import { getDB } from "./db";
import { processAndUpload } from "@/services/meals/mealService.images";
import type { MealRow } from "./types";
import { emit } from "@/services/core/events";
import { get, post } from "@/services/core/apiClient";
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
  updateUserProfileRemote,
  uploadUserAvatarRemote,
} from "@/services/user/userProfileRepository";
import {
  createServiceError,
  normalizeServiceError,
} from "@/services/contracts/serviceError";
import { resolveMealConflict } from "./conflict";

const log = Sync;

const PULL_PAGE_SIZE = 100;
const PUSH_BATCH_SIZE = 25;
const LOOP_INTERVAL_MS = 5 * 60 * 1000;
const CHAT_THREADS_PAGE_SIZE = 100;

let loopTimer: ReturnType<typeof setInterval> | null = null;
let netUnsub: null | (() => void) = null;
let running = false;
let loopRunToken = 0;
let activeLoopUid: string | null = null;
const uidSyncLocks = new Map<string, Promise<void>>();

type MealPayload = Partial<Meal> & { cloudId?: string | null; mealId?: string | null };
type ChatThreadApiItem = {
  id: string;
  title?: string | null;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string | null;
  lastMessageAt?: number | null;
};
type ChatThreadsPageApiResponse = {
  items?: ChatThreadApiItem[];
  nextBeforeUpdatedAt?: number | null;
  nextCursor?: string | null;
};
type ChatMessageApiItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  lastSyncedAt: number;
  deleted?: boolean;
};
type ChatMessagesPageApiResponse = {
  items?: ChatMessageApiItem[];
};

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

async function withUidSyncLock<T>(uid: string, task: () => Promise<T>): Promise<T> {
  const previous = uidSyncLocks.get(uid) ?? Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  uidSyncLocks.set(uid, next);

  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
    if (uidSyncLocks.get(uid) === next) {
      uidSyncLocks.delete(uid);
    }
  }
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

function toChatThread(userUid: string, item: ChatThreadApiItem): ChatThread {
  return {
    id: String(item.id || ""),
    userUid,
    title: String(item.title || ""),
    createdAt: Number(item.createdAt || 0),
    updatedAt: Number(item.updatedAt || 0),
    lastMessage: item.lastMessage ? String(item.lastMessage) : undefined,
    lastMessageAt:
      item.lastMessageAt == null ? undefined : Number(item.lastMessageAt),
  };
}

function toChatMessage(userUid: string, item: ChatMessageApiItem): ChatMessage {
  const createdAt = Number(item.createdAt || 0);
  return {
    id: String(item.id || ""),
    userUid,
    role: toChatThreadRole(item.role),
    content: String(item.content || ""),
    createdAt,
    lastSyncedAt: Number(item.lastSyncedAt || createdAt),
    syncState: "synced",
    deleted: Boolean(item.deleted),
    cloudId: String(item.id || ""),
  };
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

function keyLastChatPull(uid: string) {
  return `sync:last_pull_chat:${uid}`;
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

export async function setLastChatPullTs(uid: string, ts: number): Promise<void> {
  await AsyncStorage.setItem(keyLastChatPull(uid), String(Math.max(0, ts)));
}

export async function getLastChatPullTs(uid: string): Promise<number> {
  const raw = await AsyncStorage.getItem(keyLastChatPull(uid));
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function toChatThreadRole(
  value: string | null | undefined,
): "user" | "assistant" | "system" {
  if (value === "user" || value === "assistant" || value === "system") return value;
  return "assistant";
}

export function startSyncLoop(uid: string) {
  if (!uid) return;
  stopSyncLoop();
  activeLoopUid = uid;
  const runToken = ++loopRunToken;
  const isStale = () => runToken !== loopRunToken || activeLoopUid !== uid;

  const run = async () => {
    if (isStale()) return;
    const loopLog = log.child("loop");
    loopLog.log("run:start", { uid });
    const net = await NetInfo.fetch();
    if (isStale()) return;
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
      if (isStale()) return;
      await processImageUploads(uid);
      if (isStale()) return;
      await pushQueue(uid);
      if (isStale()) return;
      await pullChanges(uid);
      if (isStale()) return;
      await pullMyMealChanges(uid);
      if (isStale()) return;
      await pullChatChanges(uid);
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
  loopRunToken += 1;
  activeLoopUid = null;
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
  running = false;
}

export function getSyncStatus(): { running: boolean; hasTimer: boolean } {
  return {
    running,
    hasTimer: loopTimer !== null,
  };
}

export async function pushQueue(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
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
      const batch = await nextBatch(PUSH_BATCH_SIZE, uid);
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
          await setMealSyncStateLocal({
            uid,
            cloudId: id,
            syncState: "synced",
            updatedAt: String(payload?.updatedAt || op.updated_at || nowISO()),
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
          await setMyMealSyncStateLocal({
            uid,
            cloudId: docId,
            syncState: "synced",
            updatedAt: String(payload?.updatedAt || op.updated_at || nowISO()),
          });
          pushLog.log("mymeal:upsert", docId);
          emit("mymeal:synced", { uid, cloudId: docId });
        } else if (op.kind === "delete_mymeal") {
          await markMyMealDeletedRemote(uid, op.cloud_id, op.updated_at);
          pushLog.log("mymeal:delete", op.cloud_id);
          emit("mymeal:synced", { uid, cloudId: op.cloud_id });
        } else if (op.kind === "update_user_profile") {
          const payload = op.payload as Record<string, unknown> | null;
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw syncEngineError("sync/profile-invalid-payload", {
              message: "Missing or invalid user profile payload",
              retryable: false,
            });
          }
          if (Object.keys(payload).length === 0) {
            pushLog.log("profile:update:empty", { uid, opId: op.id });
          } else {
            await updateUserProfileRemote(uid, payload as Partial<UserData>);
            pushLog.log("profile:update", {
              uid,
              keys: Object.keys(payload),
            });
            emit("user:profile:synced", { uid, updatedAt: op.updated_at });
          }
        } else if (op.kind === "upload_user_avatar") {
          const payload = op.payload as { localPath?: string; updatedAt?: string } | null;
          const localPath = typeof payload?.localPath === "string"
            ? payload.localPath
            : "";
          if (!localPath) {
            throw syncEngineError("sync/avatar-missing-local-path", {
              message: "Missing local avatar path for upload operation",
              retryable: false,
            });
          }
          const uploaded = await uploadUserAvatarRemote(uid, localPath);
          emit("user:avatar:synced", {
            uid,
            avatarUrl: uploaded.avatarUrl,
            avatarLocalPath: localPath,
            avatarlastSyncedAt: uploaded.avatarlastSyncedAt,
            updatedAt: String(payload?.updatedAt || op.updated_at || nowISO()),
          });
          pushLog.log("avatar:upload", {
            uid,
            localPath,
          });
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
            `/users/me/chat/threads/${encodeURIComponent(payload.threadId)}/messages`,
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
          const nextAttempts = op.attempts + 1;
          pushLog.error("op:fail", {
            id: op.id,
            code: err.code,
            message: err.message,
            retryable: err.retryable,
          });
          if (nextAttempts >= MAX_QUEUE_ATTEMPTS) {
            await moveToDeadLetter(op, nextAttempts, {
              code: err.code,
              message: err.message,
            });
            pushLog.warn("op:dead_letter", {
              id: op.id,
              kind: op.kind,
              attempts: nextAttempts,
            });
            emit("sync:op:dead", {
              uid,
              opId: op.id,
              cloudId: op.cloud_id,
              kind: op.kind,
              attempts: nextAttempts,
              code: err.code,
            });
          } else {
            await bumpAttempts(op.id);
            pushLog.log("op:bump_attempts", { id: op.id, attempts: nextAttempts });
          }
          if (op.kind === "upsert") {
            await setMealSyncStateLocal({
              uid,
              cloudId: op.cloud_id,
              syncState: nextAttempts >= MAX_QUEUE_ATTEMPTS ? "failed" : "pending",
              updatedAt: op.updated_at,
            });
          }
          if (op.kind === "upsert_mymeal") {
            await setMyMealSyncStateLocal({
              uid,
              cloudId: op.cloud_id,
              syncState: nextAttempts >= MAX_QUEUE_ATTEMPTS ? "failed" : "pending",
              updatedAt: op.updated_at,
            });
          }
          if (op.kind === "persist_chat_message") {
            emit("chat:failed", { uid, opId: op.id });
          } else if (op.kind === "update_user_profile") {
            emit("user:profile:failed", {
              uid,
              opId: op.id,
              dead: nextAttempts >= MAX_QUEUE_ATTEMPTS,
            });
          } else if (op.kind === "upload_user_avatar") {
            emit("user:avatar:failed", {
              uid,
              opId: op.id,
              dead: nextAttempts >= MAX_QUEUE_ATTEMPTS,
            });
          } else {
            emit("meal:failed", {
              uid,
              opId: op.id,
              cloudId: op.cloud_id,
              dead: nextAttempts >= MAX_QUEUE_ATTEMPTS,
            });
          }
        }
      }

      if (batch.length < PUSH_BATCH_SIZE) break;
    }

    pushLog.timeEnd("exec");
    pushLog.log("done", { processed });
  });
}

type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

async function forEachCursorPage<T>(params: {
  initialCursor: string | null;
  fetchPage: (cursor: string | null) => Promise<CursorPage<T>>;
  onPageItems: (items: T[]) => Promise<void>;
}): Promise<void> {
  let cursor = params.initialCursor;

  for (;;) {
    const page = await params.fetchPage(cursor);
    if (!page.items.length) break;
    await params.onPageItems(page.items);

    cursor = page.nextCursor || cursor;
    if (!page.nextCursor) break;
  }
}

export async function pullChanges(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
    const pullLog = log.child("pull");
    const net = await NetInfo.fetch();
    pullLog.log("start", { uid, isConnected: net.isConnected });
    if (!net.isConnected) {
      pullLog.log("skip:offline");
      return;
    }

    pullLog.time("exec");

    const last = (await getLastPullTs(uid)) || "1970-01-01T00:00:00.000Z";
    let latestCursor = last;
    let total = 0;
    pullLog.log("since", { last });

    await forEachCursorPage({
      initialCursor: last,
      fetchPage: async (cursor) => {
        const page = await fetchMealChangesRemote({
          uid,
          pageSize: PULL_PAGE_SIZE,
          cursor,
        });
        pullLog.log("page", { size: page.items.length });
        return { items: page.items, nextCursor: page.nextCursor };
      },
      onPageItems: async (items) => {
        for (const meal of items) {
          try {
            const localMeal = meal.cloudId
              ? await getMealByCloudIdLocal(uid, meal.cloudId)
              : null;
            const resolved = localMeal ? resolveMealConflict(localMeal, meal) : meal;
            await upsertMealLocal(resolved);
            emit("meal:synced", {
              uid,
              cloudId: resolved.cloudId ?? meal.cloudId,
              updatedAt: resolved.updatedAt,
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
      },
    });

    if (latestCursor !== last) {
      await setLastPullTs(uid, latestCursor);
      pullLog.log("set_last_ts", { latestCursor });
    }
    pullLog.timeEnd("exec");
    pullLog.log("done", { items: total, last_ts: latestCursor });
  });
}

export async function pullMyMealChanges(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
    const pullLog = log.child("pull:mymeals");
    const net = await NetInfo.fetch();
    pullLog.log("start", { uid, isConnected: net.isConnected });
    if (!net.isConnected) {
      pullLog.log("skip:offline");
      return;
    }

    const last = (await getLastMyMealsPullTs(uid)) || "1970-01-01T00:00:00.000Z";
    let latestCursor = last;
    let total = 0;

    await forEachCursorPage({
      initialCursor: last,
      fetchPage: async (cursor) => {
        const page = await fetchMyMealChangesRemote({
          uid,
          pageSize: PULL_PAGE_SIZE,
          cursor,
        });
        pullLog.log("page", { size: page.items.length });
        return { items: page.items, nextCursor: page.nextCursor };
      },
      onPageItems: async (items) => {
        for (const meal of items) {
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
      },
    });

    if (latestCursor !== last) {
      await setLastMyMealsPullTs(uid, latestCursor);
      pullLog.log("set_last_ts", { latestCursor });
    }
    pullLog.log("done", { items: total, last_ts: latestCursor });
  });
}

async function pullChatThreadMessages(params: {
  uid: string;
  threadId: string;
  limitCount?: number;
}): Promise<number> {
  const limit = Math.max(1, Math.min(params.limitCount ?? 50, 200));
  const response = await get<ChatMessagesPageApiResponse>(
    `/users/me/chat/threads/${encodeURIComponent(params.threadId)}/messages?limit=${limit}`
  );
  const items = Array.isArray(response?.items) ? response.items : [];
  for (const item of items) {
    const normalized = toChatMessage(params.uid, item);
    if (!normalized.id) continue;
    await upsertChatMessageLocal({
      threadId: params.threadId,
      message: normalized,
    });
  }
  return items.length;
}

export async function pullChatChanges(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
    const pullLog = log.child("pull:chat");
    const net = await NetInfo.fetch();
    pullLog.log("start", { uid, isConnected: net.isConnected });
    if (!net.isConnected) {
      pullLog.log("skip:offline");
      return;
    }

    const lastPullTs = await getLastChatPullTs(uid);
    let newestPullTs = lastPullTs;
    let syncedThreads = 0;
    let syncedMessages = 0;
    let beforeUpdatedAtCursor: number | null = null;
    let opaqueCursor: string | null = null;

    try {
      for (;;) {
        const query = [`limit=${CHAT_THREADS_PAGE_SIZE}`];
        if (beforeUpdatedAtCursor != null) {
          query.push(
            `beforeUpdatedAt=${encodeURIComponent(String(beforeUpdatedAtCursor))}`
          );
        }
        if (opaqueCursor) {
          query.push(`cursor=${encodeURIComponent(opaqueCursor)}`);
        }

        const response = await get<ChatThreadsPageApiResponse>(
          `/users/me/chat/threads?${query.join("&")}`
        );
        const items = Array.isArray(response?.items) ? response.items : [];
        pullLog.log("threads:page", { size: items.length, lastPullTs });
        if (!items.length) break;

        for (const item of items) {
          const normalizedThread = toChatThread(uid, item);
          if (!normalizedThread.id) continue;
          newestPullTs = Math.max(newestPullTs, normalizedThread.updatedAt);

          const localThread = await getChatThreadByIdLocal(uid, normalizedThread.id);
          const localIsNewer =
            !!localThread && localThread.updatedAt > normalizedThread.updatedAt;
          if (!localIsNewer) {
            await upsertChatThreadLocal(normalizedThread);
            syncedThreads++;
          }

          const remoteLastMessageAt = normalizedThread.lastMessageAt ?? 0;
          const localLastMessageAt = localThread?.lastMessageAt ?? 0;
          const shouldSyncMessages =
            !localIsNewer &&
            (!localThread ||
              normalizedThread.updatedAt >= localThread.updatedAt ||
              remoteLastMessageAt > localLastMessageAt ||
              normalizedThread.updatedAt >= lastPullTs);

          if (!shouldSyncMessages) continue;

          try {
            syncedMessages += await pullChatThreadMessages({
              uid,
              threadId: normalizedThread.id,
              limitCount: 50,
            });
          } catch (error: unknown) {
            const err = toSyncError(error);
            pullLog.error("thread_messages:fail", {
              threadId: normalizedThread.id,
              code: err.code,
              message: err.message,
              retryable: err.retryable,
            });
          }
        }

        const nextBeforeUpdatedAt =
          typeof response?.nextBeforeUpdatedAt === "number" &&
          Number.isFinite(response.nextBeforeUpdatedAt)
            ? response.nextBeforeUpdatedAt
            : null;
        const nextCursor =
          typeof response?.nextCursor === "string" &&
          response.nextCursor.trim().length > 0
            ? response.nextCursor
            : null;

        if (nextCursor) {
          if (nextCursor === opaqueCursor) break;
          opaqueCursor = nextCursor;
          beforeUpdatedAtCursor = null;
          continue;
        }

        if (nextBeforeUpdatedAt != null) {
          if (nextBeforeUpdatedAt === beforeUpdatedAtCursor) break;
          beforeUpdatedAtCursor = nextBeforeUpdatedAt;
          opaqueCursor = null;
          continue;
        }

        break;
      }

      if (newestPullTs > lastPullTs) {
        await setLastChatPullTs(uid, newestPullTs);
        pullLog.log("set_last_ts", { newestPullTs });
      }
      pullLog.log("done", {
        threads: syncedThreads,
        messages: syncedMessages,
        lastPullTs: newestPullTs,
      });
    } catch (error: unknown) {
      const err = toSyncError(error);
      pullLog.error("threads:fail", {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      });
      throw err;
    }
  });
}

export async function processImageUploads(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
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
        const ingredients = safeParseJSON(m.ingredients);
        const normalized: Meal = {
          userUid: m.user_uid,
          mealId: m.meal_id,
          cloudId: m.cloud_id ?? undefined,
          timestamp: m.timestamp,
          type: toMealType(m.type),
          name: m.name,
          ingredients: Array.isArray(ingredients)
            ? (ingredients as Meal["ingredients"])
            : [],
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
        const payload = {
          image_id: row.image_id,
          code: err.code,
          message: err.message,
          retryable: err.retryable,
        };
        if (err.retryable) {
          upLog.warn("upload:retryable_fail", payload);
        } else {
          upLog.error("upload:fail", payload);
        }
      }
    }

    upLog.timeEnd("exec");
    upLog.log("done", { ok, fail, pending: pending.length });
  });
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
