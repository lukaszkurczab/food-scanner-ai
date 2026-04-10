import NetInfo from "@react-native-community/netinfo";
import { Sync } from "@/utils/debug";
import { normalizeServiceError } from "@/services/contracts/serviceError";
import type { SyncStrategy } from "./sync.strategy";
import { runPushQueue } from "./sync.push";
import { mealsStrategy } from "./strategies/meals.strategy";
import { myMealsStrategy } from "./strategies/myMeals.strategy";
import { chatStrategy } from "./strategies/chat.strategy";
import { userProfileStrategy } from "./strategies/userProfile.strategy";
import {
  imagesStrategy,
  processImageUploads as processImageUploadsStrategy,
} from "./strategies/images.strategy";

const log = Sync;
const PUSH_BATCH_SIZE = 25;
const LOOP_INTERVAL_MS = 5 * 60 * 1000;

let loopTimer: ReturnType<typeof setInterval> | null = null;
let netUnsub: null | (() => void) = null;
let running = false;
let loopRunToken = 0;
let activeLoopUid: string | null = null;
const uidSyncLocks = new Map<string, Promise<void>>();

const pushStrategies: SyncStrategy[] = [
  mealsStrategy,
  myMealsStrategy,
  chatStrategy,
  userProfileStrategy,
  imagesStrategy,
];

function toSyncError(error: unknown) {
  return normalizeServiceError(error, {
    code: "sync/unknown",
    source: "SyncEngine",
    retryable: true,
  });
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
    if (uidSyncLocks.get(uid) === next) uidSyncLocks.delete(uid);
  }
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
      await processImageUploadsStrategy(uid);
      if (isStale()) return;
      await pushQueue(uid);
      if (isStale()) return;
      await mealsStrategy.pull(uid);
      if (isStale()) return;
      await myMealsStrategy.pull(uid);
      if (isStale()) return;
      await chatStrategy.pull(uid);
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
  return { running, hasTimer: loopTimer !== null };
}

export async function pushQueue(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
    await runPushQueue(uid, PUSH_BATCH_SIZE, pushStrategies);
  });
}

async function pullWithLock(uid: string, strategy: SyncStrategy): Promise<void> {
  return withUidSyncLock(uid, async () => {
    await strategy.pull(uid);
  });
}

export async function pullChanges(uid: string): Promise<void> {
  return pullWithLock(uid, mealsStrategy);
}

export async function pullMyMealChanges(uid: string): Promise<void> {
  return pullWithLock(uid, myMealsStrategy);
}

export async function pullChatChanges(uid: string): Promise<void> {
  return pullWithLock(uid, chatStrategy);
}

export async function processImageUploads(uid: string): Promise<void> {
  return withUidSyncLock(uid, async () => {
    await processImageUploadsStrategy(uid);
  });
}

export {
  setLastPullTs,
  getLastPullTs,
  setLastMyMealsPullTs,
  getLastMyMealsPullTs,
  setLastChatPullTs,
  getLastChatPullTs,
} from "./sync.storage";
