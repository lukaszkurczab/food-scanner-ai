import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "@react-native-firebase/firestore";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

type QuietHours = { startHour: number; endHour: number };

const SYS_KEY_PREFIX = "notif:sys:ids:";

function sysKey(uid: string, key: string) {
  return `${SYS_KEY_PREFIX}${uid}:${key}`;
}

async function getStoredIds(uid: string, key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(sysKey(uid, key));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function storeIds(uid: string, key: string, ids: string[]) {
  try {
    await AsyncStorage.setItem(sysKey(uid, key), JSON.stringify(ids));
  } catch {}
}

async function cancelStored(uid: string, key: string) {
  const ids = await getStoredIds(uid, key);
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
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

async function getPrefs(uid: string) {
  const db = getFirestore(getApp());
  const snap = await getDoc(doc(db, "users", uid, "prefs", "global"));
  const data = snap.exists() ? (snap.data() as any) : {};

  const motivationOn = !!data?.notifications?.motivationEnabled;
  const statsOn = !!data?.notifications?.statsEnabled;

  const weekdays0to6: number[] =
    Array.isArray(data?.notifications?.weekdays0to6) &&
    data.notifications.weekdays0to6.length > 0
      ? data.notifications.weekdays0to6
      : [1, 2, 3, 4, 5, 6, 0];

  const quiet: QuietHours = {
    startHour: Number(data?.notifications?.quietHours?.startHour ?? 22),
    endHour: Number(data?.notifications?.quietHours?.endHour ?? 7),
  };

  const daysAhead = Math.min(
    Math.max(Number(data?.notifications?.daysAhead ?? 7), 1),
    14
  );

  return { motivationOn, statsOn, weekdays0to6, quiet, daysAhead };
}

async function gatePlanned(uid: string, key: string) {
  const db = getFirestore(getApp());
  const ref = doc(db, "users", uid, "notif_meta", "system");
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as any) : {};
  const plannedUntil = Number(data?.[key]?.plannedUntil ?? 0);

  return {
    shouldReschedule: Date.now() > plannedUntil - 6 * 60 * 60 * 1000,
    markPlannedUntil: async (until: number) =>
      setDoc(ref, { [key]: { plannedUntil: until } }, { merge: true }),
    clearPlannedUntil: async () =>
      setDoc(ref, { [key]: { plannedUntil: 0 } }, { merge: true }),
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
  data: Record<string, any>;
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
      content: { title, body, data },
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
