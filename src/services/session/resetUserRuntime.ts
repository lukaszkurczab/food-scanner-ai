import AsyncStorage from "@react-native-async-storage/async-storage";
import { emit } from "@/services/core/events";
import { logWarning } from "@/services/core/errorLogger";
import { resetOfflineStorage } from "@/services/offline/db";
import { cleanupUserOfflineAssets } from "@/services/offline/fileCleanup";
import { stopSyncLoop } from "@/services/offline/sync.engine";
import { cancelAllReminderScheduling } from "@/services/reminders/reminderScheduling";

export type ResetUserRuntimeReason =
  | "logout"
  | "account_switch"
  | "delete_account";

type ResetUserRuntimeStage =
  | "stop_sync_loop"
  | "cancel_reminders"
  | "reset_offline_storage"
  | "clear_async_storage"
  | "cleanup_offline_assets";

type ResetUserRuntimeFailure = {
  uid: string | null;
  reason: ResetUserRuntimeReason;
  stage: ResetUserRuntimeStage;
};

type ResetUserRuntimeOptions = {
  reason: ResetUserRuntimeReason;
};

function shouldClearUserScopedKey(key: string, uid: string): boolean {
  return (
    key === `user:profile:${uid}` ||
    key === `premium_status:${uid}` ||
    key === `ai_credits:${uid}` ||
    key.includes(`:${uid}:`) ||
    key.endsWith(`:${uid}`) ||
    key.endsWith(`_${uid}`)
  );
}

async function clearScopedAsyncStorage(uid: string | null): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const keysToRemove = uid
    ? keys.filter((key) => shouldClearUserScopedKey(key, uid))
    : [];
  keysToRemove.push("premium_status:anon");
  if (!keysToRemove.length) return;
  await AsyncStorage.multiRemove(Array.from(new Set(keysToRemove)));
}

async function runCleanupStage(
  stage: ResetUserRuntimeStage,
  uid: string | null,
  reason: ResetUserRuntimeReason,
  cleanup: () => void | Promise<void>,
): Promise<void> {
  try {
    await cleanup();
  } catch (error) {
    const payload: ResetUserRuntimeFailure = { uid, reason, stage };
    emit("session:runtime-reset:failed", payload);
    logWarning("user runtime reset stage failed", payload, error);
  }
}

export async function resetUserRuntime(
  uid: string | null,
  options: ResetUserRuntimeOptions,
): Promise<void> {
  await runCleanupStage("stop_sync_loop", uid, options.reason, () => {
    stopSyncLoop();
  });

  if (uid) {
    await runCleanupStage("cancel_reminders", uid, options.reason, () =>
      cancelAllReminderScheduling(uid),
    );
  }

  await runCleanupStage("reset_offline_storage", uid, options.reason, () => {
    resetOfflineStorage();
  });

  await runCleanupStage("clear_async_storage", uid, options.reason, () =>
    clearScopedAsyncStorage(uid),
  );

  if (uid) {
    await runCleanupStage("cleanup_offline_assets", uid, options.reason, () =>
      cleanupUserOfflineAssets(uid),
    );
  }
}

