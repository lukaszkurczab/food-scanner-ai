import { AppState, type AppStateStatus } from "react-native";
import {
  cancelAllReminderScheduling,
  reconcileReminderScheduling,
} from "@/services/reminders/reminderScheduling";
import { debugScope } from "@/utils/debug";

type RemovableSubscription = {
  remove: () => void;
};

type ReminderRuntimeReason = "auth_ready" | "app_foreground";

const FOREGROUND_RECONCILE_COOLDOWN_MS = 60_000;

const log = debugScope("ReminderRuntime");

let initialized = false;
let currentAppState: AppStateStatus = AppState.currentState;
let currentUid: string | null = null;
let appStateSubscription: RemovableSubscription | null = null;
let reconcileInFlight = false;
let pendingRun: { reason: ReminderRuntimeReason; force: boolean } | null = null;
let lastReconcileStartedAt = 0;

function isForeground(state: AppStateStatus): boolean {
  return state === "active";
}

async function cleanupReminderStateForUid(
  uid: string,
  reason: "auth_change" | "stale_reconcile",
): Promise<void> {
  try {
    await cancelAllReminderScheduling(uid);
    log.log("cleaned smart reminder state for uid", { uid, reason });
  } catch (error) {
    log.warn("failed to clean smart reminder state for uid", {
      uid,
      reason,
      error,
    });
  }
}

async function runReconcile(
  reason: ReminderRuntimeReason,
  options?: { force?: boolean },
): Promise<void> {
  const uid = currentUid;
  if (!uid) {
    return;
  }

  const force = options?.force === true;
  const now = Date.now();
  if (
    !force &&
    now - lastReconcileStartedAt < FOREGROUND_RECONCILE_COOLDOWN_MS
  ) {
    log.log("skip smart reminder reconcile because cooldown is active", {
      uid,
      reason,
      sinceMs: now - lastReconcileStartedAt,
    });
    return;
  }

  if (reconcileInFlight) {
    pendingRun = { reason, force };
    return;
  }

  reconcileInFlight = true;
  lastReconcileStartedAt = now;

  try {
    log.log("run smart reminder reconcile", { uid, reason });
    await reconcileReminderScheduling(uid);
  } catch (error) {
    log.warn("smart reminder reconcile failed", { uid, reason, error });
  } finally {
    if (uid !== currentUid) {
      await cleanupReminderStateForUid(uid, "stale_reconcile");
    }

    reconcileInFlight = false;

    if (pendingRun) {
      const next = pendingRun;
      pendingRun = null;
      void runReconcile(next.reason, { force: next.force });
    }
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  const previousState = currentAppState;
  currentAppState = nextState;

  if (!isForeground(previousState) && isForeground(nextState)) {
    void runReconcile("app_foreground");
  }
}

export async function initReminderRuntime(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  currentAppState = AppState.currentState;
  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

  if (currentUid && isForeground(currentAppState)) {
    await runReconcile("auth_ready", { force: true });
  }
}

export async function setReminderRuntimeUid(uid: string | null): Promise<void> {
  const normalizedUid = uid?.trim() || null;
  const previousUid = currentUid;
  const changed = normalizedUid !== previousUid;
  currentUid = normalizedUid;
  lastReconcileStartedAt = 0;

  if (!changed) {
    return;
  }

  if (previousUid) {
    await cleanupReminderStateForUid(previousUid, "auth_change");
  }

  if (!currentUid) {
    pendingRun = null;
    return;
  }

  if (!initialized) {
    return;
  }

  await runReconcile("auth_ready", { force: true });
}

export function stopReminderRuntime(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
  initialized = false;
  currentAppState = AppState.currentState;
  currentUid = null;
  reconcileInFlight = false;
  pendingRun = null;
  lastReconcileStartedAt = 0;
}

export function __resetReminderRuntimeForTests(): void {
  stopReminderRuntime();
}
