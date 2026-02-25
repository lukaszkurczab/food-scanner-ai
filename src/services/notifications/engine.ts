import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  type FirebaseFirestoreTypes,
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
import { debugScope } from "@/utils/debug";
import {
  asBoolean,
  asNumber,
  asString,
  isRecord,
} from "@/services/contracts/guards";
import type { MealKind, NotificationType } from "@/types/notification";

const running: Record<string, boolean> = {};
const log = debugScope("Notifications:Engine");
type UserDoc = { aiStyle?: AIStyle; calorieTarget?: number; targetKcal?: number };
const DEFAULT_TIME = { hour: 12, minute: 0 } as const;
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

const isAIStyle = (value: unknown): value is AIStyle =>
  value === "none" ||
  value === "concise" ||
  value === "friendly" ||
  value === "detailed";

const isNotificationType = (value: unknown): value is NotificationType =>
  value === "meal_reminder" || value === "calorie_goal" || value === "day_fill";

const isMealKind = (value: unknown): value is MealKind =>
  value === "breakfast" ||
  value === "lunch" ||
  value === "dinner" ||
  value === "snack";

function clampHour(value: unknown, fallback: number): number {
  const num = asNumber(value);
  if (num == null) return fallback;
  return Math.max(0, Math.min(23, Math.trunc(num)));
}

function clampMinute(value: unknown, fallback: number): number {
  const num = asNumber(value);
  if (num == null) return fallback;
  return Math.max(0, Math.min(59, Math.trunc(num)));
}

function parseDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_DAYS];
  const days = value
    .map((day) => asNumber(day))
    .filter(
      (day): day is number =>
        day != null && Number.isInteger(day) && day >= 0 && day <= 6
    );
  const unique = Array.from(new Set(days));
  return unique.length ? unique : [...DEFAULT_DAYS];
}

function parseUserDoc(value: unknown): UserDoc {
  if (!isRecord(value)) return {};
  return {
    aiStyle: isAIStyle(value.aiStyle) ? value.aiStyle : undefined,
    calorieTarget: asNumber(value.calorieTarget),
    targetKcal: asNumber(value.targetKcal),
  };
}

function parseUserNotification(
  id: string,
  value: unknown
): UserNotification | null {
  if (!isRecord(value)) return null;
  if (!isNotificationType(value.type)) return null;

  const time = isRecord(value.time)
    ? {
        hour: clampHour(value.time.hour, DEFAULT_TIME.hour),
        minute: clampMinute(value.time.minute, DEFAULT_TIME.minute),
      }
    : { ...DEFAULT_TIME };

  const mealKind = isMealKind(value.mealKind) ? value.mealKind : null;
  const kcalByHourRaw = asNumber(value.kcalByHour);

  return {
    id,
    type: value.type,
    name: asString(value.name) ?? "",
    text:
      value.text == null
        ? null
        : typeof value.text === "string"
        ? value.text
        : null,
    time,
    days: parseDays(value.days),
    enabled: asBoolean(value.enabled) ?? false,
    createdAt: asNumber(value.createdAt) ?? 0,
    updatedAt: asNumber(value.updatedAt) ?? 0,
    mealKind,
    kcalByHour: kcalByHourRaw == null ? null : kcalByHourRaw,
  };
}

export async function loadUserAIStyle(uid: string): Promise<AIStyle> {
  const app = getApp();
  const db = getFirestore(app);
  const snap = await getDoc(doc(db, "users", uid));
  const style = parseUserDoc(snap.data()).aiStyle;
  return isAIStyle(style) ? style : "none";
}

export async function listNotifications(
  uid: string
): Promise<UserNotification[]> {
  const app = getApp();
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, "users", uid, "notifications"));
  return snap.docs
    .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
      parseUserNotification(d.id, d.data())
    )
    .filter(
      (item: UserNotification | null): item is UserNotification => item !== null
    );
}

export async function reconcileAll(uid: string) {
  if (running[uid]) return;
  running[uid] = true;
  try {
    await ensureAndroidChannel();
    const aiStyle = await loadUserAIStyle(uid);
    const items = await listNotifications(uid);
    log.log("reconcile start", { uid, count: items.length });
    const locale = i18n.language;

    for (const n of items) {
      await cancelAllForNotif(n.id);
    }

    for (const n of items) {
      if (!n.enabled) {
        log.log("skip disabled", { id: n.id, type: n.type });
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
          const meals = await fetchTodayMeals(uid);
          if (!hasMealTypeToday(meals, n.mealKind)) {
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
        }
        continue;
      }

      if (n.type === "calorie_goal") {
        const user = await getDoc(doc(getFirestore(getApp()), "users", uid));
        const data = parseUserDoc(user.data());
        const target = Number(data?.calorieTarget || data?.targetKcal || 0);
        const meals = await fetchTodayMeals(uid);
        const consumed = sumConsumedKcal(meals);
        const threshold = n.kcalByHour ?? target;

        if (isKcalBelowThreshold(consumed, threshold)) {
          const next = nextOccurrenceForDays(n.time, n.days);
          if (next) {
            const goalKcal = target > 0 ? target : threshold ?? 0;
            const missing = Math.max(0, Math.round(goalKcal - consumed));
            log.log("schedule calorie goal", {
              id: n.id,
              target,
              threshold,
              consumed,
              missing,
              next,
            });
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
        }
        continue;
      }
    }
  } finally {
    log.log("reconcile done", { uid });
    running[uid] = false;
  }
}
