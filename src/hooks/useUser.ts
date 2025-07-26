import { useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import type { UserData } from "@/src/types";
import {
  fetchUserFromFirestore,
  updateUserInFirestore,
  markUserSyncedInFirestore,
} from "@/src/services/firestore/firestoreUserService";
import { pickLatest } from "@/src/utils/syncUtils";

export function useUser(uid: string) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "pending" | "conflict"
  >("pending");

  const getUserProfile = useCallback(async () => {
    setLoading(true);
    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === uid);
    const localData = localUser ? mapRawToUserData(localUser._raw) : null;
    setUser(localData);
    setSyncStatus(localData?.syncStatus || "pending");
    setLoading(false);
  }, [uid]);

  const fetchUserFromCloud = useCallback(async () => {
    return await fetchUserFromFirestore(uid);
  }, [uid]);

  const updateUserProfile = useCallback(
    async (data: Partial<UserData>) => {
      const userCollection = database.get("users");
      const users = await userCollection.query().fetch();
      const localUser = users.find((u: any) => u.uid === uid);
      if (localUser) {
        await database.write(async () => {
          await localUser.update((u: any) => {
            Object.assign(u, data, {
              updatedAt: new Date().toISOString(),
              syncStatus: "pending",
            });
          });
        });
        const newRaw = {
          ...localUser._raw,
          ...data,
          updatedAt: new Date().toISOString(),
          syncStatus: "pending",
        };
        setUser(mapRawToUserData(newRaw));
        setSyncStatus("pending");
      }
    },
    [uid]
  );

  const sendUserToCloud = useCallback(async () => {
    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === uid);
    if (localUser) {
      const localData = mapRawToUserData(localUser._raw);
      await updateUserInFirestore(uid, localData);
    }
  }, [uid]);

  const markUserAsSynced = useCallback(async () => {
    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === uid);
    if (localUser) {
      const timestamp = new Date().toISOString();
      await database.write(async () => {
        await localUser.update((u: any) => {
          u.syncStatus = "synced";
          u.lastSyncedAt = timestamp;
        });
      });
      await markUserSyncedInFirestore(uid, timestamp);
      setSyncStatus("synced");
    }
  }, [uid]);

  const syncUserProfile = useCallback(async () => {
    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === uid);
    const localData = localUser ? mapRawToUserData(localUser._raw) : null;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    const remoteData = await fetchUserFromFirestore(uid);

    if (localData && remoteData) {
      const pick = pickLatest(localData, remoteData);
      if (pick === "remote" && localUser) {
        await database.write(async () => {
          await localUser.update((u: any) => {
            Object.assign(u, remoteData, { syncStatus: "synced" });
          });
        });
        setUser(remoteData);
        setSyncStatus("synced");
      } else if (pick === "local") {
        await updateUserInFirestore(uid, localData);
        setUser(localData);
        setSyncStatus("synced");
      }
    } else if (!localData && remoteData) {
      await database.write(async () => {
        await userCollection.create((user: any) => {
          Object.assign(user, remoteData);
        });
      });
      setUser(remoteData);
      setSyncStatus("synced");
    } else if (localData && !remoteData) {
      await updateUserInFirestore(uid, localData);
      setUser(localData);
      setSyncStatus("synced");
    } else {
      setUser(null);
      setSyncStatus("pending");
    }
  }, [uid]);

  function mapRawToUserData(raw: any): UserData {
    return raw as UserData;
  }

  return {
    user,
    loading,
    syncStatus,
    getUserProfile,
    fetchUserFromCloud,
    updateUserProfile,
    sendUserToCloud,
    syncUserProfile,
    markUserAsSynced,
  };
}
