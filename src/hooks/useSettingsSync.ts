import { useEffect, useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import {
  fetchSettingsFromFirestore,
  updateSettingInFirestore,
} from "@/src/services/firestore/firestoreSettingsService";
import { Setting } from "@/src/types";

export function useSettingsSync(userUid: string) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const mapRawToSetting = (raw: any): Setting => ({
    userUid: raw.userUid,
    key: raw.key,
    value: raw.value,
    lastUpdated: raw.lastUpdated,
    syncStatus: raw.syncStatus,
  });

  const getSettings = useCallback(async (): Promise<Setting[]> => {
    const settingsCollection = database.get("settings");
    const all = await settingsCollection.query().fetch();
    return all.map((s: any) => mapRawToSetting(s._raw));
  }, []);

  const syncSettings = useCallback(async () => {
    const settingsCollection = database.get("settings");
    const SettingsArr = await settingsCollection.query().fetch();
    const Settings = SettingsArr.map((s: any) => s);
    const netInfo = await NetInfo.fetch();

    if (netInfo.isConnected) {
      const remoteSettings = await fetchSettingsFromFirestore(userUid);

      for (const remote of remoteSettings) {
        const local = Settings.find((s: any) => s.key === remote.key);
        if (!local) {
          await database.write(async () => {
            await settingsCollection.create((s: any) => {
              s.userUid = remote.userUid;
              s.key = remote.key;
              s.value = remote.value;
              s.lastUpdated = remote.lastUpdated;
              s.syncStatus = "synced";
            });
          });
        } else {
          if (remote.lastUpdated > local._raw.lastUpdated) {
            await database.write(async () => {
              await local.update((s: any) => {
                s.value = remote.value;
                s.lastUpdated = remote.lastUpdated;
                s.syncStatus = "synced";
              });
            });
          } else if (local._raw.lastUpdated > remote.lastUpdated) {
            await updateSettingInFirestore(
              userUid,
              local.key,
              local.value,
              local._raw.lastUpdated
            );
          }
        }
      }
      for (const local of Settings) {
        if (local._raw.syncStatus !== "synced") {
          await updateSettingInFirestore(
            userUid,
            local.key,
            local.value,
            local._raw.lastUpdated
          );
          await database.write(async () => {
            await local.update((s: any) => {
              s.syncStatus = "synced";
            });
          });
        }
      }
    }
    const refreshed = await getSettings();
    const dict: Record<string, string> = {};
    refreshed.forEach((s) => {
      dict[s.key] = s.value;
    });
    setSettings(dict);
    setLoading(false);
  }, [userUid, getSettings]);

  const updateSetting = useCallback(
    async (key: string, value: string) => {
      const settingsCollection = database.get("settings");
      const Settings = await settingsCollection.query().fetch();
      const local = Settings.find((s: any) => s.key === key);
      const now = new Date().toISOString();

      if (local) {
        await database.write(async () => {
          await local.update((s: any) => {
            s.value = value;
            s.lastUpdated = now;
            s.syncStatus = "pending";
          });
        });
      } else {
        await database.write(async () => {
          await settingsCollection.create((s: any) => {
            s.userUid = userUid;
            s.key = key;
            s.value = value;
            s.lastUpdated = now;
            s.syncStatus = "pending";
          });
        });
      }
      await syncSettings();
    },
    [userUid, syncSettings]
  );

  useEffect(() => {
    syncSettings();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncSettings();
    });
    return unsubscribe;
  }, [userUid, syncSettings]);

  return {
    settings,
    loading,
    updateSetting,
    syncSettings,
  };
}
