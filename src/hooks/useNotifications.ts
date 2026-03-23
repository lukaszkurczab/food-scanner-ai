import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { UserNotification } from "@/types/notification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteUserNotification,
  fetchNotificationPrefs,
  subscribeToUserNotifications,
  updateNotificationPrefs,
  upsertUserNotification,
} from "@/services/notifications/notificationsRepository";
import { reconcileAll } from "@/services/notifications/engine";
import {
  cancelAllForNotif,
  notificationScheduleKey,
} from "@/services/notifications/localScheduler";

type BoolPrefs = { enabled: boolean };

type PrefConfig = {
  key: string;
  field: "motivationEnabled" | "smartRemindersEnabled" | "statsEnabled";
  defaultValue: boolean;
};

const PREF_CONFIGS: Record<string, PrefConfig> = {
  motivation: {
    key: "motivation",
    field: "motivationEnabled",
    defaultValue: false,
  },
  smartReminders: {
    key: "smart-reminders",
    field: "smartRemindersEnabled",
    defaultValue: true,
  },
  stats: { key: "stats", field: "statsEnabled", defaultValue: false },
};

function parseCachedBoolPrefs(cached: string | null): BoolPrefs | null {
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as Partial<BoolPrefs>;
    return { enabled: !!parsed.enabled };
  } catch {
    return null;
  }
}

function cacheKey(uid: string, config: PrefConfig): string {
  return `notif:prefs:${uid}:${config.key}`;
}

async function loadPref(
  uid: string,
  config: PrefConfig,
  prefsData: Awaited<ReturnType<typeof fetchNotificationPrefs>> | null,
): Promise<BoolPrefs> {
  if (prefsData) {
    const raw = prefsData.notifications?.[config.field];
    const enabled = typeof raw === "boolean" ? raw : config.defaultValue;
    await AsyncStorage.setItem(
      cacheKey(uid, config),
      JSON.stringify({ enabled }),
    );
    return { enabled };
  }

  try {
    const cached = await AsyncStorage.getItem(cacheKey(uid, config));
    const parsed = parseCachedBoolPrefs(cached);
    if (parsed) return parsed;
  } catch {
    // Ignore malformed local cache fallback.
  }
  return { enabled: config.defaultValue };
}

async function savePref(
  uid: string,
  config: PrefConfig,
  enabled: boolean,
): Promise<void> {
  try {
    await updateNotificationPrefs(uid, { [config.field]: enabled });
    await AsyncStorage.setItem(
      cacheKey(uid, config),
      JSON.stringify({ enabled }),
    );
  } catch {
    await AsyncStorage.setItem(
      cacheKey(uid, config),
      JSON.stringify({ enabled }),
    );
  }
}

export function useNotifications(uid: string | null) {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const reconcileNotifications = useCallback(async (uidLocal: string) => {
    try {
      await reconcileAll(uidLocal);
    } catch {
      // Keep reminder CRUD independent from local scheduling failures.
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(`notif:list:${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setItems(parsed as UserNotification[]);
        }
      } catch {
        // Ignore malformed cache and continue with fresh data.
      }
      setLoading(false);
    })();

    const unsub = subscribeToUserNotifications({
      uid,
      onData: (arr) => {
        setItems(arr);
        AsyncStorage.setItem(`notif:list:${uid}`, JSON.stringify(arr)).catch(
          () => {},
        );
        setLoading(false);
      },
    });
    return unsub;
  }, [uid]);

  const create = useCallback(
    async (
      uidLocal: string,
      data: Omit<UserNotification, "id" | "createdAt" | "updatedAt">,
    ) => {
      const id = uuidv4();
      const now = Date.now();
      const payload: UserNotification = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };
      await upsertUserNotification(uidLocal, id, payload);
      await reconcileNotifications(uidLocal);
      return id;
    },
    [reconcileNotifications],
  );

  const update = useCallback(
    async (uidLocal: string, id: string, patch: Partial<UserNotification>) => {
      const existing = items.find((item) => item.id === id);
      if (!existing) return;
      const now = Date.now();
      const payload: UserNotification = {
        ...existing,
        ...patch,
        id,
        updatedAt: now,
      };
      await upsertUserNotification(uidLocal, id, payload);
      await reconcileNotifications(uidLocal);
    },
    [items, reconcileNotifications],
  );

  const remove = useCallback(
    async (uidLocal: string, id: string) => {
      await cancelAllForNotif(notificationScheduleKey(uidLocal, id));
      await deleteUserNotification(uidLocal, id);
      await reconcileNotifications(uidLocal);
    },
    [reconcileNotifications],
  );

  const toggle = useCallback(
    async (uidLocal: string, id: string, enabled: boolean) => {
      await update(uidLocal, id, { enabled });
    },
    [update],
  );

  const loadAllPrefs = useCallback(async (uidLocal: string) => {
    let prefsData: Awaited<ReturnType<typeof fetchNotificationPrefs>> | null =
      null;
    try {
      prefsData = await fetchNotificationPrefs(uidLocal);
    } catch {
      // Fall through — loadPref will use cached values.
    }

    const [motivation, smartReminders, stats] = await Promise.all([
      loadPref(uidLocal, PREF_CONFIGS.motivation, prefsData),
      loadPref(uidLocal, PREF_CONFIGS.smartReminders, prefsData),
      loadPref(uidLocal, PREF_CONFIGS.stats, prefsData),
    ]);

    return { motivation, smartReminders, stats };
  }, []);

  const setMotivationPrefs = useCallback(
    (uidLocal: string, enabled: boolean) =>
      savePref(uidLocal, PREF_CONFIGS.motivation, enabled),
    [],
  );

  const setSmartRemindersPrefs = useCallback(
    (uidLocal: string, enabled: boolean) =>
      savePref(uidLocal, PREF_CONFIGS.smartReminders, enabled),
    [],
  );

  const setStatsPrefs = useCallback(
    (uidLocal: string, enabled: boolean) =>
      savePref(uidLocal, PREF_CONFIGS.stats, enabled),
    [],
  );

  return useMemo(
    () => ({
      items,
      loading,
      create,
      update,
      remove,
      toggle,
      loadAllPrefs,
      setMotivationPrefs,
      setSmartRemindersPrefs,
      setStatsPrefs,
    }),
    [
      items,
      loading,
      create,
      update,
      remove,
      toggle,
      loadAllPrefs,
      setMotivationPrefs,
      setSmartRemindersPrefs,
      setStatsPrefs,
    ],
  );
}
