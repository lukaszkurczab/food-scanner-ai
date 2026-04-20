import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  MealKind,
  UserNotification,
} from "@/types/notification";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import { logError } from "@/services/core/errorLogger";

const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_REMINDER_TIME = { hour: 12, minute: 0 };

type NotificationFormNavigation = StackNavigationProp<
  RootStackParamList,
  "NotificationForm"
>;

export function useNotificationFormState(params: {
  uid: string | null;
  notifId: string | null;
  locale?: string;
  nav: NotificationFormNavigation;
  labels: {
    defaultName: string;
  };
}) {
  const { items, create, update, remove } = useNotifications(params.uid);
  const existing = useMemo(
    () => items.find((item) => item.id === params.notifId) || null,
    [items, params.notifId],
  );

  const [name, setName] = useState(existing?.name || params.labels.defaultName);
  const [text, setText] = useState<string>(existing?.text || "");
  const [time, setTime] = useState<{ hour: number; minute: number }>(
    existing?.time || DEFAULT_REMINDER_TIME,
  );
  const [days, setDays] = useState<number[]>(existing?.days || DEFAULT_DAYS);
  const [enabled, setEnabled] = useState<boolean>(existing?.enabled ?? true);
  const [mealKind, setMealKind] = useState<MealKind>(
    existing?.mealKind ?? "other",
  );
  const [timeVisible, setTimeVisible] = useState(false);
  const [tmp, setTmp] = useState<Date>(() => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    return date;
  });
  const initialSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setText(existing.text || "");
      setTime(existing.time);
      setDays(existing.days);
      setEnabled(existing.enabled);
      setMealKind(existing.mealKind ?? "other");
    }
  }, [existing]);

  useEffect(() => {
    initialSnapshotRef.current = null;
  }, [params.notifId]);

  useEffect(() => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    setTmp(date);
  }, [time.hour, time.minute]);

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        name: name.trim(),
        text: text.trim(),
        timeHour: time.hour,
        timeMinute: time.minute,
        days: [...days].sort((left, right) => left - right),
        enabled,
        mealKind,
      }),
    [days, enabled, mealKind, name, text, time.hour, time.minute],
  );

  useEffect(() => {
    if (initialSnapshotRef.current === null) {
      initialSnapshotRef.current = snapshot;
    }
  }, [snapshot]);

  const prefers12h = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat(params.locale, {
        hour: "numeric",
        timeZone: "UTC",
      }).formatToParts(new Date(Date.UTC(2020, 0, 1, 13)));
      return parts.some((part) => part.type === "dayPeriod");
    } catch {
      return false;
    }
  }, [params.locale]);

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat(params.locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [params.locale],
  );

  const openTimePicker = useCallback(() => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    setTmp(date);
    setTimeVisible(true);
  }, [time.hour, time.minute]);

  const closeTimePicker = useCallback(() => {
    setTimeVisible(false);
  }, []);

  const confirmTime = useCallback(() => {
    setTime({ hour: tmp.getHours(), minute: tmp.getMinutes() });
    setTimeVisible(false);
  }, [tmp]);

  const onSave = useCallback(async () => {
    if (!params.uid) return;

    const payload: Omit<UserNotification, "id" | "createdAt" | "updatedAt"> = {
      type: "meal_reminder",
      name: name.trim() || params.labels.defaultName,
      text: text.trim() || null,
      time,
      days,
      enabled,
      mealKind,
      kcalByHour: null,
    };

    try {
      await (params.notifId
        ? update(params.uid, params.notifId, payload)
        : create(params.uid, payload));
    } catch (error) {
      logError("save notification failed", null, error);
    }

    if (params.nav.canGoBack()) {
      params.nav.goBack();
    } else {
      params.nav.navigate("Notifications");
    }
  }, [
    create,
    days,
    enabled,
    mealKind,
    name,
    params.labels.defaultName,
    params.nav,
    params.notifId,
    params.uid,
    text,
    time,
    update,
  ]);

  const onDelete = useCallback(() => {
    const uid = params.uid;
    const notifId = params.notifId;
    if (!uid || !notifId) return;

    void remove(uid, notifId).finally(() => {
      if (params.nav.canGoBack()) {
        params.nav.goBack();
      } else {
        params.nav.navigate("Notifications");
      }
    });
  }, [params.nav, params.notifId, params.uid, remove]);

  const hasUnsavedChanges =
    initialSnapshotRef.current !== null &&
    snapshot !== initialSnapshotRef.current;

  return {
    name,
    setName,
    text,
    setText,
    time,
    setTime,
    days,
    setDays,
    enabled,
    setEnabled,
    mealKind,
    setMealKind,
    timeVisible,
    tmp,
    setTmp,
    prefers12h,
    fmtTime,
    openTimePicker,
    closeTimePicker,
    confirmTime,
    onSave,
    onDelete,
    hasUnsavedChanges,
  };
}
