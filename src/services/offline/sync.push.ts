import NetInfo from "@react-native-community/netinfo";
import { Sync } from "@/utils/debug";
import { emit } from "@/services/core/events";
import { isOfflineNetState } from "@/services/core/networkState";
import {
  createServiceError,
  normalizeServiceError,
} from "@/services/contracts/serviceError";
import {
  nextBatch,
  markDone,
  bumpAttempts,
  moveToDeadLetter,
  MAX_QUEUE_ATTEMPTS,
} from "./queue.repo";
import { setMealSyncStateLocal } from "./meals.repo";
import { setMyMealSyncStateLocal } from "./myMeals.repo";
import type { SyncStrategy } from "./sync.strategy";

const log = Sync;

function toSyncError(error: unknown) {
  return normalizeServiceError(error, {
    code: "sync/unknown",
    source: "SyncEngine",
    retryable: true,
  });
}

export async function runPushQueue(
  uid: string,
  pushBatchSize: number,
  strategies: SyncStrategy[]
): Promise<void> {
  const pushLog = log.child("push");
  const net = await NetInfo.fetch();
  pushLog.log("start", { uid, isConnected: net.isConnected });
  if (isOfflineNetState(net)) {
    pushLog.log("skip:offline");
    return;
  }
  pushLog.time("exec");
  let processed = 0;

  for (;;) {
    const batch = await nextBatch(pushBatchSize, uid);
    pushLog.log("batch:next", { size: batch.length });
    if (batch.length === 0) break;

    for (const op of batch) {
      pushLog.log("op:start", { id: op.id, kind: op.kind });
      try {
        let handled = false;
        for (const strategy of strategies) {
          if (await strategy.handlePushOp(uid, op)) {
            handled = true;
            break;
          }
        }
        if (!handled) {
          pushLog.warn("unknown_op", op.kind);
          throw createServiceError({
            code: "sync/unknown-op",
            source: "SyncEngine",
            message: `Unknown queue operation: ${op.kind}`,
            retryable: false,
          });
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
        const shouldDeadLetter =
          !err.retryable || nextAttempts >= MAX_QUEUE_ATTEMPTS;
        if (shouldDeadLetter) {
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
            syncState: shouldDeadLetter ? "failed" : "pending",
            updatedAt: op.updated_at,
          });
        }
        if (op.kind === "upsert_mymeal") {
          await setMyMealSyncStateLocal({
            uid,
            cloudId: op.cloud_id,
            syncState: shouldDeadLetter ? "failed" : "pending",
            updatedAt: op.updated_at,
          });
        }
        if (op.kind === "persist_chat_message") {
          emit("chat:failed", { uid, opId: op.id });
        } else if (op.kind === "update_user_profile") {
          emit("user:profile:failed", {
            uid,
            opId: op.id,
            dead: shouldDeadLetter,
          });
        } else if (op.kind === "upload_user_avatar") {
          emit("user:avatar:failed", {
            uid,
            opId: op.id,
            dead: shouldDeadLetter,
          });
        } else {
          emit("meal:failed", {
            uid,
            opId: op.id,
            cloudId: op.cloud_id,
            dead: shouldDeadLetter,
          });
        }
      }
    }

    if (batch.length < pushBatchSize) break;
  }

  pushLog.timeEnd("exec");
  pushLog.log("done", { processed });
}
