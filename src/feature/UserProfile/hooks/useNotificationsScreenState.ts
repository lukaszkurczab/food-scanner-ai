import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useNotifications } from "@/hooks/useNotifications";
import {
  cancelAllForNotif,
  ensureAndroidChannel,
} from "@/services/notifications/localScheduler";
import {
  cancelSystemNotifications,
  runSystemNotifications,
} from "@/services/notifications/system";

export function useNotificationsScreenState(uid: string | null) {
  const {
    items,
    toggle,
    loadMotivationPrefs,
    setMotivationPrefs,
    setStatsPrefs,
    loadStatsPrefs,
    remove,
  } = useNotifications(uid);

  const [motivationEnabled, setMotivationEnabled] = useState(false);
  const [statsEnabled, setStatsEnabled] = useState(false);
  const [systemAllowed, setSystemAllowed] = useState<boolean | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingsCtaVisible, setSettingsCtaVisible] = useState(false);
  const autoDisabledRef = useRef(false);

  useEffect(() => {
    autoDisabledRef.current = false;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const motivation = await loadMotivationPrefs(uid);
      const stats = await loadStatsPrefs(uid);
      setMotivationEnabled(!!motivation.enabled);
      setStatsEnabled(!!stats.enabled);
      const perm = await Notifications.getPermissionsAsync();
      setSystemAllowed(!!perm.granted);
      if (perm.granted && Platform.OS === "android") {
        await ensureAndroidChannel();
      }
      if (perm.granted) {
        await runSystemNotifications(uid);
      }
    })();
  }, [uid, loadMotivationPrefs, loadStatsPrefs]);

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
        } catch {
          // Keep local toggles unchanged if sync fails.
        }
      }
    })();
  }, [
    systemAllowed,
    uid,
    items,
    motivationEnabled,
    statsEnabled,
    setMotivationPrefs,
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
        await runSystemNotifications(uid);
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
        await runSystemNotifications(uid);
      } else {
        await cancelSystemNotifications(uid, "stats_weekly_summary");
      }
    },
    [requestSystemPermission, setStatsPrefs, systemAllowed, uid],
  );

  const askDelete = useCallback((id: string) => {
    setConfirmId(id);
  }, []);

  const cancelDelete = useCallback(() => {
    if (!deleting) {
      setConfirmId(null);
    }
  }, [deleting]);

  const onConfirmDelete = useCallback(async () => {
    if (!uid || !confirmId) return;
    setDeleting(true);
    try {
      await cancelAllForNotif(confirmId);
      await remove(uid, confirmId);
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  }, [confirmId, remove, uid]);

  return {
    items,
    motivationEnabled,
    statsEnabled,
    systemAllowed,
    confirmId,
    deleting,
    settingsCtaVisible,
    setSettingsCtaVisible,
    openSettings,
    onToggleReminder,
    onToggleMotivation,
    onToggleStats,
    askDelete,
    cancelDelete,
    onConfirmDelete,
  };
}
