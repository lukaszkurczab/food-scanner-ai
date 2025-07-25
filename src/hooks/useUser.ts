import { useEffect, useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import type { UserData } from "@/src/types";
import {
  fetchUserFromFirestore,
  updateUserInFirestore,
  markUserSyncedInFirestore,
} from "@services/firestore/firestoreUserService";
import { pickLatest } from "@/src/utils/syncUtils";

export function useUser(uid: string) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "pending" | "conflict"
  >("pending");

  const mapRawToUserData = (raw: any): UserData | null => {
    if (!raw) return null;
    return {
      uid: raw.uid,
      email: raw.email,
      username: raw.username,
      plan: raw.plan,
      firstLogin: raw.firstLogin,
      createdAt: raw.createdAt,
      lastLogin: raw.lastLogin,
      nutritionSurvey: raw.nutritionSurvey,
      onboardingVersion: raw.onboardingVersion,
      syncStatus: raw.syncStatus,
      updatedAt: raw.updatedAt,
      lastSyncedAt: raw.lastSyncedAt,
    };
  };

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
    if (!localUser) return;
    const localData = mapRawToUserData(localUser._raw);
    if (!localData) return;
    const remoteData = await fetchUserFromFirestore(uid);

    if (!remoteData || localData.updatedAt > remoteData.updatedAt) {
      await updateUserInFirestore(uid, localData);
      await markUserAsSynced();
    } else if (remoteData.updatedAt > localData.updatedAt && localUser) {
      await database.write(async () => {
        await localUser.update((u: any) => {
          Object.assign(u, remoteData, { syncStatus: "synced" });
        });
      });
      setUser(remoteData);
      setSyncStatus("synced");
    } else {
      await markUserAsSynced();
    }
  }, [uid, markUserAsSynced]);

  const getUserProfile = useCallback(async () => {
    setLoading(true);
    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === uid);
    const localData = localUser ? mapRawToUserData(localUser._raw) : null;

    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      const remoteData = await fetchUserFromFirestore(uid);
      if (localData && remoteData) {
        const pick = pickLatest(localData, remoteData);
        if (pick === "remote" && localUser) {
          await database.write(async () => {
            await localUser.update((u: any) => {
              Object.assign(u, remoteData);
            });
          });
          setUser(remoteData);
          setSyncStatus("synced");
        } else if (pick === "local") {
          await updateUserInFirestore(uid, localData);
          setUser(localData);
          setSyncStatus("synced");
        } else {
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
    } else {
      setUser(localData);
      setSyncStatus(localData?.syncStatus || "pending");
    }
    setLoading(false);
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
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await syncUserProfile();
      }
    },
    [uid, syncUserProfile]
  );

  useEffect(() => {
    getUserProfile();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) syncUserProfile();
    });
    return unsubscribe;
  }, [uid, getUserProfile, syncUserProfile]);

  return {
    user,
    loading,
    syncStatus,
    getUserProfile,
    updateUserProfile,
    syncUserProfile,
    markUserAsSynced,
  };
}
