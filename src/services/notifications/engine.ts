import { getNotificationText } from "./texts";
import {
  ensureAndroidChannel,
  scheduleDailyAt,
  scheduleOneShotAt,
  cancelAllForNotif,
  nextOccurrenceForDays,
} from "./localScheduler";
import { getNotificationPlan } from "./planService";
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

    for (const n of plans) {
      await cancelAllForNotif(n.id);
    }

    for (const n of plans) {
      if (!n.enabled || !n.shouldSchedule) {
        log.log("skip ineligible", { id: n.id, type: n.type });
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
            n.id
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
              n.id
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
            n.id
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
            n.id
          );
        }
        continue;
      }
    }
  } finally {
    log.log("reconcile done", { uid });
    running[uid] = false;
  }
}
