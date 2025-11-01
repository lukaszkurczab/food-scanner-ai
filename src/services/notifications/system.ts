import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "@react-native-firebase/firestore";
import * as Notifications from "expo-notifications";

function atToday(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function getPrefs(uid: string) {
  const db = getFirestore(getApp());
  const snap = await getDoc(doc(db, "users", uid, "prefs"));
  const data = snap.exists() ? (snap.data() as any) : {};
  const motivationOn = !!data?.notifications?.motivationEnabled;
  const statsOn = !!data?.notifications?.statsEnabled;
  return { motivationOn, statsOn };
}

async function lastSentGate(uid: string, key: string, minDays: number) {
  const db = getFirestore(getApp());
  const ref = doc(db, "users", uid, "notif_meta", "system");
  const snap = await getDoc(ref);
  const data = snap.exists() ? (snap.data() as any) : {};
  const last = data?.[key]?.lastSentAt || 0;
  const diffDays = (Date.now() - last) / 86400000;
  return {
    allowed: diffDays >= minDays,
    mark: async () =>
      setDoc(ref, { [key]: { lastSentAt: Date.now() } }, { merge: true }),
  };
}

function isSunday(date = new Date()) {
  return date.getDay() === 0;
}

function isMonday(date = new Date()) {
  return date.getDay() === 1;
}

function isFirstOfMonth(date = new Date()) {
  return date.getDate() === 1;
}

export async function runSystemNotifications(uid: string) {
  const { motivationOn, statsOn } = await getPrefs(uid);

  if (motivationOn) {
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "motivation_dont_give_up_cap",
        2
      );
      if (allowed) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Stay consistent",
            body: "Every entry counts.",
            data: { sys: "motivation_dont_give_up" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atToday(15, 0),
          },
        });
        await mark();
      }
    }
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "motivation_streak_daily",
        1
      );
      const streakOk = false;
      if (allowed && streakOk) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Keep it up",
            body: "You\u2019re on a streak!",
            data: { sys: "motivation_streak" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atToday(8, 0),
          },
        });
        await mark();
      }
    }
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "motivation_missing_day_daily",
        1
      );
      const missingYesterday = false;
      if (allowed && missingYesterday) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Start fresh",
            body: "Yesterday was empty. Log today.",
            data: { sys: "motivation_missing_day" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atToday(9, 0),
          },
        });
        await mark();
      }
    }
  }

  if (statsOn) {
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "stats_weekly_summary",
        6
      );
      if (allowed && isSunday()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Weekly summary",
            body: "Check your weekly average.",
            data: { sys: "stats_weekly_summary" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atToday(20, 0),
          },
        });
        await mark();
      }
    }
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "stats_macro_balance",
        2
      );
      const lowProtein = false;
      if (allowed && lowProtein) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Macro insight",
            body: "Your protein intake is lower than usual.",
            data: { sys: "stats_macro_balance" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atToday(18, 0),
          },
        });
        await mark();
      }
    }
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "stats_goal_progress",
        25
      );
      if (allowed && isFirstOfMonth()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Monthly progress",
            body: "You\u2019re moving toward your target.",
            data: { sys: "stats_goal_progress" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atToday(20, 0),
          },
        });
        await mark();
      }
    }
    {
      const { allowed, mark } = await lastSentGate(
        uid,
        "stats_trend_detected",
        6
      );
      if (allowed && isMonday()) {
        const trendDown = false;
        if (trendDown) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Trend detected",
              body: "You\u2019re logging fewer meals than last week.",
              data: { sys: "stats_trend_detected" },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: atToday(10, 0),
            },
          });
          await mark();
        }
      }
    }
  }
}
