import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserNotification, AIStyle } from "@/types/notification";
import { getNotificationText } from "./texts";

const KEY_PREFIX = "notif:ids:";

function mapWeekdayToCalendar(val: number) {
  return ((val + 1) % 7) + 1;
}

export async function cancelAllForNotif(localKey: string) {
  const key = KEY_PREFIX + localKey;
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    const ids: string[] = JSON.parse(raw);
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
  }
  await AsyncStorage.setItem(key, JSON.stringify([]));
}

async function storeId(localKey: string, id: string) {
  const key = KEY_PREFIX + localKey;
  const raw = await AsyncStorage.getItem(key);
  const arr: string[] = raw ? JSON.parse(raw) : [];
  arr.push(id);
  await AsyncStorage.setItem(key, JSON.stringify(arr));
}

export async function scheduleMealReminder(
  notif: UserNotification,
  aiStyle: AIStyle
) {
  await cancelAllForNotif(notif.id);
  if (!notif.enabled) return;

  const { title, body } = getNotificationText("meal_reminder", aiStyle);

  for (const d of notif.days) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { notifId: notif.id, type: notif.type } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        hour: notif.time.hour,
        minute: notif.time.minute,
        weekday: mapWeekdayToCalendar(d),
      } as Notifications.CalendarTriggerInput,
    });
    await storeId(notif.id, id);
  }
}

export async function scheduleOneShotAt(
  date: Date,
  payload: { title: string; body: string; data: any },
  localKey: string
) {
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: payload.title, body: payload.body, data: payload.data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    } as Notifications.DateTriggerInput,
  });
  await storeId(localKey, id);
}

export function nextOccurrenceForDays(
  time: { hour: number; minute: number },
  days: number[]
): Date | null {
  if (!days || days.length === 0) return null;
  const now = new Date();
  const todayDow = now.getDay();
  let best: Date | null = null;
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    if (days.includes(dow)) {
      d.setHours(time.hour, time.minute, 0, 0);
      if (d > now && (!best || d < best)) best = d;
    }
  }
  return best;
}
