import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useNotifications } from "@/hooks/useNotifications";
import { reconcileAll } from "@/services/notifications/engine";
import { ensureAndroidChannel } from "@/services/notifications/localScheduler";
import {
  cancelSystemNotifications,
} from "@/services/notifications/system";
import {
  cancelAllReminderScheduling,
} from "@/services/reminders/reminderScheduling";

export function useNotificationsScreenState(uid: string | null) {
  const {
    items,
    loading,
    toggle,
    loadAllPrefs,
    setMotivationPrefs,
    setSmartRemindersPrefs,
    setStatsPrefs,
  } = useNotifications(uid);

  const [motivationEnabled, setMotivationEnabled] = useState(false);
  const [smartRemindersEnabled, setSmartRemindersEnabled] = useState(false);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [systemAllowed, setSystemAllowed] = useState<boolean | null>(null);
  const [settingsCtaVisible, setSettingsCtaVisible] = useState(false);
  const autoDisabledRef = useRef(false);

  useEffect(() => {
    autoDisabledRef.current = false;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { motivation, smartReminders, stats } = await loadAllPrefs(uid);
      setMotivationEnabled(!!motivation.enabled);
      setSmartRemindersEnabled(!!smartReminders.enabled);
      setStatsEnabled(!!stats.enabled);
      const perm = await Notifications.getPermissionsAsync();
      setSystemAllowed(!!perm.granted);
      if (perm.granted && Platform.OS === "android") {
        await ensureAndroidChannel();
      }
      if (perm.granted) {
        await reconcileAll(uid);
      }
    })();
  }, [uid, loadAllPrefs]);

  useEffect(() => {
    (async () => {
      if (!uid) return;
      if (systemAllowed === false && !autoDisabledRef.current) {
        autoDisabledRef.current = true;
        try {
          if (motivationEnabled) {
            setMotivationEnabled(false);
            await setMotivationPrefs(uid, false);
          }
          if (smartRemindersEnabled) {
            setSmartRemindersEnabled(false);
            await setSmartRemindersPrefs(uid, false);
          }
          if (statsEnabled) {
            setStatsEnabled(false);
            await setStatsPrefs(uid, false);
          }
          for (const item of items) {
            if (item.enabled) {
              await toggle(uid, item.id, false);
            }
          }
          await cancelSystemNotifications(uid, "motivation_dont_give_up");
          await cancelSystemNotifications(uid, "stats_weekly_summary");
          await cancelAllReminderScheduling(uid);
        } catch {
          // Keep local toggles unchanged if sync fails.
        }
      }
    })();
  }, [
    systemAllowed,
    uid,
    items,
    loading,
    motivationEnabled,
    smartRemindersEnabled,
    statsEnabled,
    setMotivationPrefs,
    setSmartRemindersPrefs,
    setStatsPrefs,
    toggle,
  ]);

  const requestSystemPermission = useCallback(async (): Promise<boolean> => {
    try {
      const res = await Notifications.requestPermissionsAsync();
      const granted = !!res.granted;
      setSystemAllowed(granted);
      if (granted && Platform.OS === "android") {
        await ensureAndroidChannel();
      }
      if (!granted) {
        setSettingsCtaVisible(true);
      }
      return granted;
    } catch {
      return false;
    }
  }, []);

  const openSettings = useCallback(async () => {
    setSettingsCtaVisible(false);
    try {
      await Linking.openSettings();
    } catch {
      // Ignore settings deep-link failures.
    }
  }, []);

  const onToggleReminder = useCallback(
    async (id: string, enabled: boolean) => {
      if (!uid) return;
      if (enabled && systemAllowed === false) {
        const allowed = await requestSystemPermission();
        if (!allowed) return;
      }
      await toggle(uid, id, enabled);
    },
    [requestSystemPermission, systemAllowed, toggle, uid],
  );

  const onToggleSmartReminders = useCallback(
    async (enabled: boolean) => {
      if (!uid) return;
      if (enabled && systemAllowed === false) {
        const allowed = await requestSystemPermission();
        if (!allowed) return;
      }

      setSmartRemindersEnabled(enabled);
      await setSmartRemindersPrefs(uid, enabled);

      if (systemAllowed === false) {
        if (!enabled) {
          await cancelAllReminderScheduling(uid);
        }
        return;
      }

      if (enabled) {
        await reconcileAll(uid);
      } else {
        await cancelAllReminderScheduling(uid);
      }
    },
    [requestSystemPermission, setSmartRemindersPrefs, systemAllowed, uid],
  );

  const onToggleMotivation = useCallback(
    async (enabled: boolean) => {
      if (!uid) return;
      if (enabled && systemAllowed === false) {
        const allowed = await requestSystemPermission();
        if (!allowed) return;
      }

      setMotivationEnabled(enabled);
      await setMotivationPrefs(uid, enabled);

      if (enabled) {
        await reconcileAll(uid);
      } else {
        await cancelSystemNotifications(uid, "motivation_dont_give_up");
      }
    },
    [requestSystemPermission, setMotivationPrefs, systemAllowed, uid],
  );

  const onToggleStats = useCallback(
    async (enabled: boolean) => {
      if (!uid) return;
      if (enabled && systemAllowed === false) {
        const allowed = await requestSystemPermission();
        if (!allowed) return;
      }

      setStatsEnabled(enabled);
      await setStatsPrefs(uid, enabled);

      if (enabled) {
        await reconcileAll(uid);
      } else {
        await cancelSystemNotifications(uid, "stats_weekly_summary");
      }
    },
    [requestSystemPermission, setStatsPrefs, systemAllowed, uid],
  );

  return {
    items,
    loading,
    motivationEnabled,
    smartRemindersEnabled,
    statsEnabled,
    systemAllowed,
    settingsCtaVisible,
    setSettingsCtaVisible,
    openSettings,
    onToggleReminder,
    onToggleSmartReminders,
    onToggleMotivation,
    onToggleStats,
  };
}
