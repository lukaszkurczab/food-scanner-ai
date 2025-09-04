// src/services/notifications/engine.ts
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "@react-native-firebase/firestore";
import type { UserNotification, AIStyle } from "@/types/notification";
import { getNotificationText } from "./texts";
import {
  fetchTodayMeals,
  sumConsumedKcal,
  hasAnyMealsToday,
  isKcalBelowThreshold,
  hasMealTypeToday,
} from "./conditions";
import {
  ensureAndroidChannel,
  scheduleDailyAt,
  scheduleOneShotAt,
  cancelAllForNotif,
  nextOccurrenceForDays,
} from "./localScheduler";
import i18n from "@/i18n";

const running: Record<string, boolean> = {};

export async function loadUserAIStyle(uid: string): Promise<AIStyle> {
  const app = getApp();
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, "users", uid));
  const style = (snap.data() as any)?.aiStyle || "none";
  return style as AIStyle;
}

export async function listNotifications(
  uid: string
): Promise<UserNotification[]> {
  const app = getApp();
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, "users", uid, "notifications"));
  const items = snap.docs.map((d: any) => ({
    id: d.id,
    ...(d.data() as any),
  })) as UserNotification[];
  return items.filter((n) => !!n.type);
}

export async function reconcileAll(uid: string) {
  if (running[uid]) return;
  running[uid] = true;
  try {
    await ensureAndroidChannel();
    const aiStyle = await loadUserAIStyle(uid);
    const items = await listNotifications(uid);
    const locale = i18n.language;

    for (const n of items) {
      await cancelAllForNotif(n.id);
    }

    for (const n of items) {
      if (!n.enabled) continue;

      if (n.type === "meal_reminder") {
        const mealLabel = (n as any)?.mealKind
          ? i18n.t(`notifications.meals.${(n as any).mealKind}`)
          : i18n.t("notifications.meals.any");
        const tt = getNotificationText(
          "meal_reminder",
          aiStyle,
          { mealKindLabel: mealLabel },
          locale
        );

        if (!(n as any)?.mealKind) {
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
          const meals = await fetchTodayMeals(uid);
          if (!hasMealTypeToday(meals, (n as any).mealKind)) {
            const next = nextOccurrenceForDays(n.time, n.days);
            if (next) {
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
        }
        continue;
      }

      if (n.type === "calorie_goal") {
        const user = await getDoc(doc(getFirestore(getApp()), "users", uid));
        const target = Number((user.data() as any)?.targetKcal || 0);
        const meals = await fetchTodayMeals(uid);
        const consumed = sumConsumedKcal(meals);
        const threshold = (n as any)?.kcalByHour ?? target;

        if (isKcalBelowThreshold(consumed, threshold)) {
          const next = nextOccurrenceForDays(n.time, n.days);
          if (next) {
            const missing = Math.max(
              0,
              Math.round((threshold ?? 0) - consumed)
            );
            const tt = getNotificationText(
              "calorie_goal",
              aiStyle,
              { missingKcal: missing },
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
        }
        continue;
      }

      if (n.type === "day_fill") {
        const meals = await fetchTodayMeals(uid);
        const anyMeals = hasAnyMealsToday(meals);
        if (!anyMeals) {
          const next = nextOccurrenceForDays(n.time, n.days);
          if (next) {
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
                body: tt.body,
                data: { notifId: n.id, type: n.type },
              },
              n.id
            );
          }
        }
        continue;
      }
    }
  } finally {
    running[uid] = false;
  }
}
