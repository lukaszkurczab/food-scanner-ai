import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isRecord } from "@/services/contracts/guards";
import { emitNotificationScheduledTelemetry } from "@/services/notifications/notificationTelemetry";

const KEY_PREFIX = "notif:ids:";
const USER_NOTIFICATION_ORIGIN = "user_notifications";

function key(localKey: string) {
  return KEY_PREFIX + localKey;
}

export function notificationScheduleKey(uid: string, notificationId: string): string {
  return `${uid}:${notificationId}`;
}

function parseStoredIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function buildTelemetryContent(
  content: Notifications.NotificationContentInput,
): Notifications.NotificationContentInput {
  const data = isRecord(content.data) ? content.data : {};
  return {
    ...content,
    data: {
      ...data,
      origin: USER_NOTIFICATION_ORIGIN,
    },
  };
}

function resolveNotificationTypeFromContent(
  content: Notifications.NotificationContentInput,
): string | null {
  if (!isRecord(content.data)) {
    return null;
  }

  return typeof content.data.type === "string" ? content.data.type : null;
}

async function storeId(localKey: string, id: string) {
  const raw = await AsyncStorage.getItem(key(localKey));
  const arr = parseStoredIds(raw);
  arr.push(id);
  await AsyncStorage.setItem(key(localKey), JSON.stringify(arr));
}

export async function cancelAllForNotif(localKey: string) {
  const raw = await AsyncStorage.getItem(key(localKey));
  const ids = parseStoredIds(raw);
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore missing/already-cancelled local IDs.
    }
  }
  await AsyncStorage.setItem(key(localKey), JSON.stringify([]));
}

export async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      description: "General notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: undefined,
      enableVibrate: true,
      enableLights: false,
      showBadge: true,
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
  const contentWithTelemetry = buildTelemetryContent(content);
  const id = await Notifications.scheduleNotificationAsync({
    content: contentWithTelemetry,
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
  void emitNotificationScheduledTelemetry({
    notificationType: resolveNotificationTypeFromContent(contentWithTelemetry),
    origin: USER_NOTIFICATION_ORIGIN,
  });
}

export async function scheduleWeekdaysIOS(
  days0to6: number[],
  hour: number,
  minute: number,
  content: Notifications.NotificationContentInput,
  localKey: string
) {
  for (const d of days0to6) {
    const contentWithTelemetry = buildTelemetryContent(content);
    const id = await Notifications.scheduleNotificationAsync({
      content: contentWithTelemetry,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        repeats: true,
        weekday: iosWeekdayFrom0to6(d),
        hour,
        minute,
      },
    });
    await storeId(localKey, id);
    void emitNotificationScheduledTelemetry({
      notificationType: resolveNotificationTypeFromContent(contentWithTelemetry),
      origin: USER_NOTIFICATION_ORIGIN,
    });
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
  const contentWithTelemetry = buildTelemetryContent({
    title,
    body,
    data: { notifId: n.id, type: "meal_reminder" },
  });
  if (Platform.OS === "ios") {
    for (const d of n.days) {
      const id = await Notifications.scheduleNotificationAsync({
        content: contentWithTelemetry,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          weekday: iosWeekdayFrom0to6(d),
          hour: n.time.hour,
          minute: n.time.minute,
        } as Notifications.NotificationTriggerInput,
      });
      await storeId(n.id, id);
      void emitNotificationScheduledTelemetry({
        notificationType: "meal_reminder",
        origin: USER_NOTIFICATION_ORIGIN,
      });
    }
  } else {
    const id = await Notifications.scheduleNotificationAsync({
      content: contentWithTelemetry,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: n.time.hour,
        minute: n.time.minute,
        repeats: true,
        channelId: "default",
      } as Notifications.NotificationTriggerInput,
    });
    await storeId(n.id, id);
    void emitNotificationScheduledTelemetry({
      notificationType: "meal_reminder",
      origin: USER_NOTIFICATION_ORIGIN,
    });
  }
}

export async function scheduleOneShotAt(
  when: Date,
  content: Notifications.NotificationContentInput,
  localKey: string
) {
  const contentWithTelemetry = buildTelemetryContent(content);
  const id = await Notifications.scheduleNotificationAsync({
    content: contentWithTelemetry,
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
  await storeId(localKey, id);
  void emitNotificationScheduledTelemetry({
    notificationType: resolveNotificationTypeFromContent(contentWithTelemetry),
    origin: USER_NOTIFICATION_ORIGIN,
  });
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
