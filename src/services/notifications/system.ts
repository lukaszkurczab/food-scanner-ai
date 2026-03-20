import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  asBoolean,
  asNumber,
  asString,
  isRecord,
} from "@/services/contracts/guards";
import { emitNotificationScheduledTelemetry } from "@/services/notifications/notificationTelemetry";
import { fetchNotificationPrefs } from "@/services/notifications/notificationsRepository";
import { parseStoredIds } from "@/services/notifications/storageUtils";

type QuietHours = { startHour: number; endHour: number };

const SYS_KEY_PREFIX = "notif:sys:ids:";
const SYS_PLANNED_KEY_PREFIX = "notif:sys:planned:";
const SYS_PREFS_CACHE_KEY_PREFIX = "notif:sys:prefs:";
const SYSTEM_NOTIFICATION_SOURCE = "system_notifications";

function sysKey(uid: string, key: string) {
  return `${SYS_KEY_PREFIX}${uid}:${key}`;
}

function plannedKey(uid: string, key: string) {
  return `${SYS_PLANNED_KEY_PREFIX}${uid}:${key}`;
}

function prefsCacheKey(uid: string) {
  return `${SYS_PREFS_CACHE_KEY_PREFIX}${uid}`;
}

async function getStoredIds(uid: string, key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(sysKey(uid, key));
    return parseStoredIds(raw);
  } catch {
    return [];
  }
}

async function storeIds(uid: string, key: string, ids: string[]) {
  try {
    await AsyncStorage.setItem(sysKey(uid, key), JSON.stringify(ids));
  } catch {
    // Ignore cache write failures for notification ids.
  }
}

async function cancelStored(uid: string, key: string) {
  const ids = await getStoredIds(uid, key);
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore cancellation failures for stale ids.
    }
  }
  await storeIds(uid, key, []);
}

function isInQuietHours(d: Date, q: QuietHours) {
  const h = d.getHours();
  if (q.startHour === q.endHour) return false;
  if (q.startHour < q.endHour) return h >= q.startHour && h < q.endHour;
  return h >= q.startHour || h < q.endHour;
}

function bumpOutOfQuietHours(d: Date, q: QuietHours) {
  if (!isInQuietHours(d, q)) return d;
  const next = new Date(d);
  next.setHours(q.endHour, 0, 0, 0);
  if (next <= d) next.setDate(next.getDate() + 1);
  return next;
}

function dateWithTime(base: Date, hour: number, minute: number) {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function isAllowedWeekday(d: Date, weekdays0to6: number[]) {
  if (!weekdays0to6?.length) return true;
  return weekdays0to6.includes(d.getDay());
}

function upcomingDays(n: number) {
  const out: Date[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push(d);
  }
  return out;
}

function clampHour(value: number, fallback: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(23, Math.trunc(value)))
    : fallback;
}

function parseWeekdays0to6(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((day) => asNumber(day))
    .filter(
      (day): day is number =>
        typeof day === "number" &&
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6
    );
  return Array.from(new Set(normalized));
}

async function readCachedEnabled(key: string): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.enabled === "boolean" ? parsed.enabled : null;
  } catch {
    return null;
  }
}

async function getPrefs(uid: string) {
  let raw: unknown = null;
  try {
    const response = await fetchNotificationPrefs(uid);
    raw = response;
    await AsyncStorage.setItem(prefsCacheKey(uid), JSON.stringify(response));
  } catch {
    try {
      const cached = await AsyncStorage.getItem(prefsCacheKey(uid));
      raw = cached ? JSON.parse(cached) : null;
    } catch {
      raw = null;
    }
  }
  const notifications =
    isRecord(raw) && isRecord(raw.notifications) ? raw.notifications : null;
  const quietHours =
    notifications && isRecord(notifications.quietHours)
      ? notifications.quietHours
      : null;
  const cachedMotivation = await readCachedEnabled(`notif:prefs:${uid}:motivation`);
  const cachedStats = await readCachedEnabled(`notif:prefs:${uid}:stats`);

  const motivationOn =
    cachedMotivation ??
    (notifications ? asBoolean(notifications.motivationEnabled) : undefined) ??
    false;
  const statsOn =
    cachedStats ??
    (notifications ? asBoolean(notifications.statsEnabled) : undefined) ?? false;
  const weekdays0to6 = parseWeekdays0to6(
    notifications ? notifications.weekdays0to6 : undefined
  );

  const quiet: QuietHours = {
    startHour: clampHour(asNumber(quietHours?.startHour) ?? Number.NaN, 22),
    endHour: clampHour(asNumber(quietHours?.endHour) ?? Number.NaN, 7),
  };

  const rawDaysAhead = notifications
    ? asNumber(notifications.daysAhead)
    : undefined;
  const daysAhead = Math.min(Math.max(rawDaysAhead ?? 7, 1), 14);

  return {
    motivationOn,
    statsOn,
    weekdays0to6: weekdays0to6.length ? weekdays0to6 : [1, 2, 3, 4, 5, 6, 0],
    quiet,
    daysAhead,
  };
}

async function gatePlanned(uid: string, key: string) {
  let plannedUntil = 0;
  try {
    const raw = await AsyncStorage.getItem(plannedKey(uid, key));
    plannedUntil = asNumber(raw ? JSON.parse(raw) : null) ?? 0;
  } catch {
    plannedUntil = 0;
  }

  return {
    shouldReschedule: Date.now() > plannedUntil - 6 * 60 * 60 * 1000,
    markPlannedUntil: async (until: number) =>
      AsyncStorage.setItem(plannedKey(uid, key), JSON.stringify(until)),
    clearPlannedUntil: async () =>
      AsyncStorage.setItem(plannedKey(uid, key), JSON.stringify(0)),
  };
}

async function scheduleKeyForNextDays(args: {
  uid: string;
  key: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekdays0to6: number[];
  quiet: QuietHours;
  daysAhead: number;
  data: Record<string, unknown>;
}) {
  const {
    uid,
    key,
    title,
    body,
    hour,
    minute,
    weekdays0to6,
    quiet,
    daysAhead,
    data,
  } = args;

  const { shouldReschedule, markPlannedUntil } = await gatePlanned(uid, key);
  if (!shouldReschedule) return;

  await cancelStored(uid, key);

  const now = new Date();
  const ids: string[] = [];

  const days = upcomingDays(daysAhead);
  for (const day of days) {
    if (!isAllowedWeekday(day, weekdays0to6)) continue;

    let when = dateWithTime(day, hour, minute);
    if (when <= now) continue;

    when = bumpOutOfQuietHours(when, quiet);
    if (when <= now) continue;
    if (!isAllowedWeekday(when, weekdays0to6)) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          origin: SYSTEM_NOTIFICATION_SOURCE,
        },
      },
      trigger: Platform.select({
        android: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: "default",
        },
        ios: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
        },
      }) as Notifications.NotificationTriggerInput,
    });

    ids.push(id);
    void emitNotificationScheduledTelemetry({
      notificationType: asString(data.sys) ?? key,
      origin: SYSTEM_NOTIFICATION_SOURCE,
    });
  }

  await storeIds(uid, key, ids);

  const plannedUntil = Date.now() + daysAhead * 24 * 60 * 60 * 1000;
  await markPlannedUntil(plannedUntil);
}

export async function cancelSystemNotifications(uid: string, key: string) {
  await cancelStored(uid, key);
  const { clearPlannedUntil } = await gatePlanned(uid, key);
  await clearPlannedUntil();
}

export async function runSystemNotifications(uid: string) {
  const { motivationOn, statsOn, weekdays0to6, quiet, daysAhead } =
    await getPrefs(uid);

  if (motivationOn) {
    await scheduleKeyForNextDays({
      uid,
      key: "motivation_dont_give_up",
      title: "Stay consistent",
      body: "Every entry counts.",
      hour: 15,
      minute: 0,
      weekdays0to6,
      quiet,
      daysAhead,
      data: { sys: "motivation_dont_give_up" },
    });
  }

  if (statsOn) {
    await scheduleKeyForNextDays({
      uid,
      key: "stats_weekly_summary",
      title: "Weekly summary",
      body: "Check your weekly average.",
      hour: 20,
      minute: 0,
      weekdays0to6,
      quiet,
      daysAhead,
      data: { sys: "stats_weekly_summary" },
    });
  }
}
