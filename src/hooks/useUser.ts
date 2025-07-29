import { useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import { Q } from "@nozbe/watermelondb";
import type { UserData } from "@/src/types";
import {
  fetchUserFromFirestore,
  updateUserInFirestore,
  markUserSyncedInFirestore,
  deleteUserInFirestore,
} from "@/src/services/firestore/firestoreUserService";
import { pickLatest } from "@/src/utils/syncUtils";
import {
  getAuth,
  deleteUser as deleteAuthUser,
} from "@react-native-firebase/auth";

export function useUser(uid: string) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "pending" | "conflict"
  >("pending");

  const getUserProfile = useCallback(async () => {
    setLoading(true);
    const userCollection = database.get("users");
    let localUser = null;
    try {
      const found = await userCollection.query(Q.where("uid", uid)).fetch();
      localUser = found[0] || null;
    } catch (e) {
      localUser = null;
    }

    let localData = localUser ? mapRawToUserData(localUser._raw) : null;

    if (!localData) {
      const remoteData = await fetchUserFromFirestore(uid);
      if (remoteData) {
        try {
          await database.write(async () => {
            await userCollection.create((user: any) => {
              Object.assign(user, remoteData);
            });
          });
        } catch (err) {
          console.log(err);
        }
        localData = remoteData;
      }
    }
    setUserData(localData);
    setSyncStatus(localData?.syncState || "pending");
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
        setUserData(mapRawToUserData(newRaw));
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
        setUserData(remoteData);
        setSyncStatus("synced");
      } else if (pick === "local") {
        await updateUserInFirestore(uid, localData);
        setUserData(localData);
        setSyncStatus("synced");
      }
    } else if (!localData && remoteData) {
      await database.write(async () => {
        await userCollection.create((user: any) => {
          Object.assign(user, remoteData);
        });
      });
      setUserData(remoteData);
      setSyncStatus("synced");
    } else if (localData && !remoteData) {
      await updateUserInFirestore(uid, localData);
      setUserData(localData);
      setSyncStatus("synced");
    } else {
      setUserData(null);
      setSyncStatus("pending");
    }
  }, [uid]);

  const deleteUser = useCallback(async () => {
    if (!uid) return;
    await deleteUserInFirestore(uid);

    const userCollection = database.get("users");
    const users = await userCollection.query().fetch();
    const localUser = users.find((u: any) => u.uid === uid);
    if (localUser) {
      await database.write(async () => {
        await localUser.markAsDeleted();
      });
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      await deleteAuthUser(currentUser);
    }

    setUserData(null);
    setSyncStatus("pending");
  }, [uid]);

  function mapRawToUserData(raw: any): UserData {
    return raw as UserData;
  }

  return {
    userData,
    loading,
    syncStatus,
    getUserProfile,
    fetchUserFromCloud,
    updateUserProfile,
    sendUserToCloud,
    syncUserProfile,
    markUserAsSynced,
    deleteUser,
  };
}
