import { useCallback, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { database } from "@/src/db/database";
import { Q } from "@nozbe/watermelondb";
import type { UserData } from "@/src/types";
import {
  fetchUserFromFirestore,
  updateUserInFirestore,
  markUserSyncedInFirestore,
  deleteUserInFirestoreWithUsername,
  uploadAndSaveAvatar,
  changeUsernameService,
  changeEmailService,
  changePasswordService,
  exportUserData,
  updateUserLanguageInFirestore,
} from "@/src/services/firestore/firestoreUserService";
import { pickLatest } from "@/src/utils/syncUtils";
import {
  getAuth,
  deleteUser as deleteAuthUser,
} from "@react-native-firebase/auth";
import { omitLocalUserKeys } from "@/src/utils/omitLocalUserKeys";
import { savePhotoLocally } from "@/src/utils/savePhotoLocally";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

const LANGUAGE_KEY = "caloriai_language";

export function useUser(uid: string) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setsyncState] = useState<"synced" | "pending" | "conflict">(
    "pending"
  );
  const [language, setLanguageState] = useState<string>("en");

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
      setUserData(localData);
    }
    setsyncState(localData?.syncState || "pending");
    setLoading(false);
    if (localData?.language) {
      setLanguageState(localData.language);
      await AsyncStorage.setItem(LANGUAGE_KEY, localData.language);
    }
    return localData;
  }, [uid]);

  const updateUserProfile = useCallback(
    async (data: Partial<UserData>) => {
      const userCollection = database.get("users");
      const users = await userCollection.query().fetch();
      const localUser = users.find((u: any) => u.uid === uid);

      if (localUser) {
        const sanitizeData = omitLocalUserKeys(data);
        await database.write(async () => {
          try {
            await localUser.update((u: any) => {
              Object.assign(u, sanitizeData, {
                lastSyncedAt: new Date().toISOString(),
                syncState: "pending",
              });
            });
          } catch (err) {
            console.log(err);
          }
        });
        const newRaw = {
          ...localUser._raw,
          ...sanitizeData,
          lastSyncedAt: new Date().toISOString(),
          syncState: "pending",
        };
        setUserData(mapRawToUserData(newRaw));
        setsyncState("pending");
        if (sanitizeData.language) {
          setLanguageState(sanitizeData.language);
          await AsyncStorage.setItem(LANGUAGE_KEY, sanitizeData.language);
        }
      }
    },
    [uid]
  );

  const setAvatar = useCallback(
    async (photoUri: string) => {
      const localPath = FileSystem.documentDirectory + `avatar_${uid}.jpg`;
      const now = new Date().toISOString();
      await savePhotoLocally({ photoUri, path: localPath });
      try {
        await updateUserProfile({
          avatarLocalPath: localPath,
          avatarlastSyncedAt: now,
          syncState: "pending",
        });
      } catch (e) {
        console.log(e);
      }
      try {
        const { avatarUrl, avatarlastSyncedAt } = await uploadAndSaveAvatar({
          userUid: uid,
          localUri: localPath,
        });
        await updateUserProfile({
          avatarUrl,
          avatarlastSyncedAt: new Date(avatarlastSyncedAt).toISOString(),
          syncState: "synced",
        });
      } catch (e) {}
    },
    [uid, updateUserProfile]
  );

  const fetchUserFromCloud = useCallback(async () => {
    return await fetchUserFromFirestore(uid);
  }, [uid]);

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
          u.syncState = "synced";
          u.lastSyncedAt = timestamp;
        });
      });
      await markUserSyncedInFirestore(uid, timestamp);
      setsyncState("synced");
    }
  }, [uid]);

  const syncUserProfile = useCallback(async () => {
    const userCollection = database.get("users");
    let localUser = null;
    try {
      const found = await userCollection.query(Q.where("uid", uid)).fetch();
      localUser = found[0] || null;
    } catch (e) {
      localUser = null;
    }

    let localData = localUser ? mapRawToUserData(localUser._raw) : null;
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;
    const remoteData = await fetchUserFromFirestore(uid);

    if (localData && remoteData) {
      const sanitizeData = omitLocalUserKeys(localData);
      const pick = pickLatest(sanitizeData, remoteData);
      if (pick === "remote" && localUser) {
        await database.write(async () => {
          await localUser.update((u: any) => {
            Object.assign(u, remoteData, { syncState: "synced" });
          });
        });
        setUserData(remoteData);
        setsyncState("synced");
        if (remoteData.language) {
          setLanguageState(remoteData.language);
          await AsyncStorage.setItem(LANGUAGE_KEY, remoteData.language);
        }
      } else {
        await updateUserInFirestore(uid, localData);
        setUserData(localData);
        setsyncState("synced");
        if (localData.language) {
          setLanguageState(localData.language);
          await AsyncStorage.setItem(LANGUAGE_KEY, localData.language);
        }
      }
    } else if (!localData && remoteData) {
      const sanitizeData = omitLocalUserKeys(remoteData);
      await database.write(async () => {
        await userCollection.create((user: any) => {
          Object.assign(user, sanitizeData);
        });
      });
      setUserData(remoteData);
      setsyncState("synced");
      if (remoteData.language) {
        setLanguageState(remoteData.language);
        await AsyncStorage.setItem(LANGUAGE_KEY, remoteData.language);
      }
    } else if (localData && !remoteData) {
      const sanitizeData = omitLocalUserKeys(localData);
      await updateUserInFirestore(uid, sanitizeData);
      setUserData(localData);
      setsyncState("synced");
      if (localData.language) {
        setLanguageState(localData.language);
        await AsyncStorage.setItem(LANGUAGE_KEY, localData.language);
      }
    } else {
      setUserData(null);
      setsyncState("pending");
    }
  }, [uid]);

  const changeUsername = useCallback(
    async (newUsername: string, password: string) => {
      await changeUsernameService({ uid, newUsername, password });
      const userCollection = database.get("users");
      const users = await userCollection.query().fetch();
      const localUser = users.find((u: any) => u.uid === uid);
      if (localUser) {
        await database.write(async () => {
          await localUser.update((u: any) => {
            u.username = newUsername;
          });
        });
        setUserData((prev) =>
          prev ? { ...prev, username: newUsername } : prev
        );
      }
    },
    [uid]
  );

  const changeEmail = useCallback(
    async (newEmail: string, password: string) => {
      await changeEmailService({ uid, newEmail, password });
    },
    [uid]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordService({ currentPassword, newPassword });
    },
    []
  );

  const changeLanguage = useCallback(
    async (newLang: string) => {
      if (!uid) {
        setLanguageState(newLang);
        await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
        return;
      }
      const userCollection = database.get("users");
      const users = await userCollection.query().fetch();
      const localUser = users.find((u: any) => u.uid === uid);
      if (localUser) {
        await database.write(async () => {
          await localUser.update((u: any) => {
            u.language = newLang;
            u.syncState = "pending";
          });
        });
      }
      await updateUserLanguageInFirestore(uid, newLang);
      setLanguageState(newLang);
      await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
    },
    [uid]
  );

  const handleExportUserData = useCallback(async () => {
    return await exportUserData(uid);
  }, [uid]);

  const deleteUser = useCallback(async () => {
    if (!uid) return;
    await deleteUserInFirestoreWithUsername(uid);
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
    setsyncState("pending");
  }, [uid]);

  function mapRawToUserData(raw: any): UserData {
    return raw as UserData;
  }

  return {
    userData,
    loading,
    syncState,
    getUserProfile,
    fetchUserFromCloud,
    updateUserProfile,
    sendUserToCloud,
    syncUserProfile,
    markUserAsSynced,
    deleteUser,
    setAvatar,
    changeUsername,
    changeEmail,
    changePassword,
    exportUserData: handleExportUserData,
    language,
    changeLanguage,
  };
}
