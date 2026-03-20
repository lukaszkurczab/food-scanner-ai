import { getNotificationText } from "./texts";
import {
  ensureAndroidChannel,
  scheduleDailyAt,
  scheduleOneShotAt,
  cancelAllForNotif,
  notificationScheduleKey,
  nextOccurrenceForDays,
} from "./localScheduler";
import { getNotificationPlan } from "./planService";
import { runSystemNotifications } from "./system";
import { reconcileReminderScheduling } from "@/services/reminders/reminderScheduling";
import { isSmartRemindersEnabled } from "@/services/reminders/reminderService";
import i18n from "@/i18n";
import { debugScope } from "@/utils/debug";

const running: Record<string, boolean> = {};
const log = debugScope("Notifications:Engine");

export async function reconcileAll(uid: string) {
  if (running[uid]) return;
  running[uid] = true;
  try {
    await ensureAndroidChannel();
    const { aiStyle, plans } = await getNotificationPlan(uid);
    log.log("reconcile start", { uid, count: plans.length });
    const locale = i18n.language;
    const smartRemindersEnabled = isSmartRemindersEnabled();
    let smartOwnsReminderTypes = false;

    if (smartRemindersEnabled) {
      try {
        const reminderSchedulingResult = await reconcileReminderScheduling(uid);
        smartOwnsReminderTypes =
          reminderSchedulingResult.result.status === "live_success" &&
          reminderSchedulingResult.result.decision !== null;
      } catch (error) {
        log.warn("smart reminder reconcile failed before legacy ownership decision", {
          uid,
          error,
        });
      }
    }

    for (const n of plans) {
      await cancelAllForNotif(notificationScheduleKey(uid, n.id));
    }

    for (const n of plans) {
      if (!n.enabled || !n.shouldSchedule) {
        log.log("skip ineligible", { id: n.id, type: n.type });
        continue;
      }

      if (
        smartOwnsReminderTypes &&
        (n.type === "meal_reminder" || n.type === "day_fill")
      ) {
        log.log("skip legacy reminder scheduling because smart reminders own this type", {
          id: n.id,
          type: n.type,
        });
        continue;
      }

      if (n.type === "meal_reminder") {
        const mealLabel = n.mealKind
          ? i18n.t(`notifications:meals.${n.mealKind}`)
          : i18n.t("notifications:meals.any");
        const tt = getNotificationText(
          "meal_reminder",
          aiStyle,
          { mealKindLabel: mealLabel },
          locale
        );

        if (!n.mealKind) {
          log.log("schedule daily meal reminder", {
            id: n.id,
            hour: n.time.hour,
            minute: n.time.minute,
          });
          await scheduleDailyAt(
            n.time.hour,
            n.time.minute,
            {
              title: tt.title,
              body: n.text ?? tt.body,
              data: { notifId: n.id, type: n.type },
            },
            notificationScheduleKey(uid, n.id)
          );
        } else {
          const next = nextOccurrenceForDays(n.time, n.days);
          if (next) {
            log.log("schedule one-shot meal reminder", {
              id: n.id,
              next,
            });
            await scheduleOneShotAt(
              next,
              {
                title: tt.title,
                body: n.text ?? tt.body,
                data: { notifId: n.id, type: n.type },
              },
              notificationScheduleKey(uid, n.id)
            );
          }
        }
        continue;
      }

      if (n.type === "calorie_goal") {
        const next = nextOccurrenceForDays(n.time, n.days);
        if (next) {
          log.log("schedule calorie goal", {
            id: n.id,
            missing: n.missingKcal,
            next,
          });
          const tt = getNotificationText(
            "calorie_goal",
            aiStyle,
            { missingKcal: n.missingKcal ?? 0 },
            locale
          );
          await scheduleOneShotAt(
            next,
            {
              title: tt.title,
              body: n.text ?? tt.body,
              data: { notifId: n.id, type: n.type },
            },
            notificationScheduleKey(uid, n.id)
          );
        }
        continue;
      }

      if (n.type === "day_fill") {
        const next = nextOccurrenceForDays(n.time, n.days);
        if (next) {
          log.log("schedule day fill", { id: n.id, next });
          const tt = getNotificationText(
            "day_fill",
            aiStyle,
            undefined,
            locale
          );
          await scheduleOneShotAt(
            next,
            {
              title: tt.title,
              body: n.text ?? tt.body,
              data: { notifId: n.id, type: n.type },
            },
            notificationScheduleKey(uid, n.id)
          );
        }
        continue;
      }
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
