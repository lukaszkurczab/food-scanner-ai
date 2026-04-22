import { ensureAndroidChannel } from "./localScheduler";
import { runSystemNotifications } from "./system";
import { reconcileReminderScheduling } from "@/services/reminders/reminderScheduling";
import { isSmartRemindersEnabled } from "@/services/reminders/reminderService";
import { debugScope } from "@/utils/debug";

const running: Record<string, boolean> = {};
const log = debugScope("Notifications:Engine");

export async function reconcileAll(uid: string) {
  if (running[uid]) return;
  running[uid] = true;
  try {
    await ensureAndroidChannel();
    log.log("reconcile start", { uid });
    const smartRemindersEnabled = isSmartRemindersEnabled();

    if (smartRemindersEnabled) {
      try {
        const reminderResult = await reconcileReminderScheduling(uid);
        log.log("smart reminder reconcile result", {
          uid,
          outcome: reminderResult.outcome,
          reason: reminderResult.reason,
          status: reminderResult.result.status,
          source: reminderResult.result.source,
          decision: reminderResult.result.decision?.decision ?? null,
        });
      } catch (error) {
        log.warn("smart reminder reconcile failed", {
          uid,
          error,
        });
      }
    } else {
      log.log("smart reminders disabled globally; canonical reminder scheduling stays inactive", {
        uid,
      });
    }

    try {
      await runSystemNotifications(uid);
    } catch (error) {
      log.warn("system notifications reconcile failed", { uid, error });
    }
  } finally {
    log.log("reconcile done", { uid });
    running[uid] = false;
  }
}
