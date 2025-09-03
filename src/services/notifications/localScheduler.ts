import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY_PREFIX = "notif:ids:";

function key(localKey: string) {
  return KEY_PREFIX + localKey;
}

async function storeId(localKey: string, id: string) {
  const raw = await AsyncStorage.getItem(key(localKey));
  const arr: string[] = raw ? JSON.parse(raw) : [];
  arr.push(id);
  await AsyncStorage.setItem(key(localKey), JSON.stringify(arr));
}

export async function cancelAllForNotif(localKey: string) {
  const raw = await AsyncStorage.getItem(key(localKey));
  if (raw) {
    const ids: string[] = JSON.parse(raw);
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
  }
  await AsyncStorage.setItem(key(localKey), JSON.stringify([]));
}

export async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function iosWeekdayFrom0to6(w: number) {
  return ((w + 1) % 7) + 1;
}

export async function scheduleDailyAt(
  hour: number,
  minute: number,
  content: Notifications.NotificationContentInput,
  localKey: string
) {
  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.select({
      android: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
        channelId: "default",
      },
      ios: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      },
    }) as Notifications.NotificationTriggerInput,
  });
  await storeId(localKey, id);
}

export async function scheduleWeekdaysIOS(
  days0to6: number[],
  hour: number,
  minute: number,
  content: Notifications.NotificationContentInput,
  localKey: string
) {
  for (const d of days0to6) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        weekday: iosWeekdayFrom0to6(d),
        hour,
        minute,
      },
    });
    await storeId(localKey, id);
  }
}

export async function scheduleMealReminder(
  n: {
    id: string;
    time: { hour: number; minute: number };
    days: number[];
    text?: string | null;
  },
  title: string,
  body: string
) {
  if (Platform.OS === "ios") {
    for (const d of n.days) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { notifId: n.id, type: "meal_reminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          weekday: iosWeekdayFrom0to6(d),
          hour: n.time.hour,
          minute: n.time.minute,
        } as Notifications.NotificationTriggerInput,
      });
      await storeId(n.id, id);
    }
  } else {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { notifId: n.id, type: "meal_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: n.time.hour,
        minute: n.time.minute,
        repeats: true,
        channelId: "default",
      } as Notifications.NotificationTriggerInput,
    });
    await storeId(n.id, id);
  }
}

export async function scheduleOneShotAt(
  when: Date,
  content: Notifications.NotificationContentInput,
  localKey: string
) {
  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
  await storeId(localKey, id);
}

export function nextOccurrenceForDays(
  time: { hour: number; minute: number },
  days: number[]
): Date | null {
  if (!days?.length) return null;
  const now = new Date();
  for (let off = 0; off < 14; off++) {
    const d = new Date(now);
    d.setDate(now.getDate() + off);
    const weekday0Sun = d.getDay();
    if (days.includes(weekday0Sun)) {
      d.setHours(time.hour, time.minute, 0, 0);
      if (d > now) return d;
    }
  }
  return null;
}
