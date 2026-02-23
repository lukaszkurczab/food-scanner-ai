import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  MealKind,
  NotificationType,
  UserNotification,
} from "@/types/notification";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

const TYPES: NotificationType[] = ["meal_reminder", "calorie_goal"];
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 0];

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
    deleteTitle: string;
    deleteMessage: string;
    cancel: string;
    delete: string;
  };
  mealOptions: Array<{ label: string; value: MealKind | null }>;
}) {
  const { items, create, update, remove } = useNotifications(params.uid);
  const existing = useMemo(
    () => items.find((item) => item.id === params.notifId) || null,
    [items, params.notifId],
  );

  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState<NotificationType>(
    existing?.type || "meal_reminder",
  );
  const [text, setText] = useState<string>(existing?.text || "");
  const [time, setTime] = useState<{ hour: number; minute: number }>(
    existing?.time || { hour: 20, minute: 0 },
  );
  const [days, setDays] = useState<number[]>(existing?.days || DEFAULT_DAYS);
  const [enabled, setEnabled] = useState<boolean>(existing?.enabled ?? true);
  const [mealKind, setMealKind] = useState<MealKind | null>(
    existing?.mealKind ?? null,
  );
  const [kcalByHour, setKcalByHour] = useState<number | null>(
    existing?.kcalByHour ?? null,
  );
  const [timeVisible, setTimeVisible] = useState(false);
  const [tmp, setTmp] = useState<Date>(() => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    return date;
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      setText(existing.text || "");
      setTime(existing.time);
      setDays(existing.days);
      setEnabled(existing.enabled);
      setMealKind(existing.mealKind ?? null);
      setKcalByHour(existing.kcalByHour ?? null);
    }
  }, [existing]);

  useEffect(() => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    setTmp(date);
  }, [time.hour, time.minute]);

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
      type,
      name: name.trim() || params.labels.defaultName,
      text: text.trim() || null,
      time,
      days,
      enabled,
      mealKind: type === "meal_reminder" ? (mealKind ?? null) : null,
      kcalByHour: type === "calorie_goal" ? (kcalByHour ?? null) : null,
    };

    try {
      await (params.notifId
        ? update(params.uid, params.notifId, payload)
        : create(params.uid, payload));
    } catch (error) {
      console.error("Error saving notification:", error);
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
    kcalByHour,
    mealKind,
    name,
    params.labels.defaultName,
    params.nav,
    params.notifId,
    params.uid,
    text,
    time,
    type,
    update,
  ]);

  const onDelete = useCallback(() => {
    const uid = params.uid;
    const notifId = params.notifId;
    if (!uid || !notifId) return;

    Alert.alert(params.labels.deleteTitle, params.labels.deleteMessage, [
      { text: params.labels.cancel, style: "cancel" },
      {
        text: params.labels.delete,
        style: "destructive",
        onPress: async () => {
          await remove(uid, notifId);
          params.nav.goBack();
        },
      },
    ]);
  }, [
    params.labels.cancel,
    params.labels.delete,
    params.labels.deleteMessage,
    params.labels.deleteTitle,
    params.nav,
    params.notifId,
    params.uid,
    remove,
  ]);

  return {
    types: TYPES,
    name,
    setName,
    type,
    setType,
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
    kcalByHour,
    setKcalByHour,
    timeVisible,
    tmp,
    setTmp,
    prefers12h,
    fmtTime,
    mealOptions: params.mealOptions,
    openTimePicker,
    closeTimePicker,
    confirmTime,
    onSave,
    onDelete,
  };
}
