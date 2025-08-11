import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserData } from "@/types";
import { savePhotoLocally } from "@utils/savePhotoLocally";
import {
  getUserLocal,
  upsertUserLocal,
  syncUserProfile as syncUserProfileRepo,
  fetchUserFromCloud as fetchUserFromCloudRepo,
  updateUserLanguageInFirestore,
  uploadAndSaveAvatar,
  changeUsernameService,
  changeEmailService,
  changePasswordService,
  exportUserData as exportUserDataRepo,
  deleteUserInFirestoreWithUsername,
} from "@/services/userService";
import { getUserQueue } from "@/sync/queues";

export function useUser(uid: string) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<"synced" | "pending" | "conflict">(
    "pending"
  );
  const [language, setLanguage] = useState<string>("en");

  const getUserProfile = useCallback(async () => {
    setLoading(true);
    if (!uid) {
      setUserData(null);
      setLoading(false);
      return null;
    }
    const local = await getUserLocal(uid);
    if (local) {
      setUserData(local);
      setSyncState(local.syncState);
      if (local.language) setLanguage(local.language);
    }
    setLoading(false);
    return local;
  }, [uid]);

  useEffect(() => {
    getUserProfile();
  }, [getUserProfile]);

  const updateUserProfile = useCallback(
    async (patch: Partial<UserData>) => {
      if (!uid) return;
      const prev = await getUserLocal(uid);
      const next: UserData | null = prev
        ? {
            ...prev,
            ...patch,
            syncState: "pending",
            lastSyncedAt: new Date().toISOString(),
          }
        : null;
      if (next) {
        await upsertUserLocal(next);
        getUserQueue(uid).enqueue({ kind: "sync", userUid: uid });
        setUserData(next);
        setSyncState("pending");
        if (patch.language) setLanguage(patch.language);
      }
    },
    [uid]
  );

  const setAvatar = useCallback(
    async (photoUri: string) => {
      if (!uid) return;
      const localPath = await savePhotoLocally({
        userUid: uid,
        fileId: "avatar",
        photoUri,
      });
      await updateUserProfile({
        avatarLocalPath: localPath,
        avatarlastSyncedAt: new Date().toISOString(),
      });
      try {
        const res = await uploadAndSaveAvatar({
          userUid: uid,
          localUri: localPath,
        });
        await updateUserProfile({
          avatarUrl: res.avatarUrl,
          avatarlastSyncedAt: res.avatarlastSyncedAt,
          syncState: "synced",
        });
      } catch {}
    },
    [uid, updateUserProfile]
  );

  const fetchUserFromCloud = useCallback(async () => {
    if (!uid) return null;
    return await fetchUserFromCloudRepo(uid);
  }, [uid]);

  const sendUserToCloud = useCallback(async () => {
    if (!uid) return;
    await syncUserProfileRepo(uid);
    await getUserProfile();
  }, [uid, getUserProfile]);

  const markUserAsSynced = useCallback(async () => {
    if (!uid) return;
    await syncUserProfileRepo(uid);
    await getUserProfile();
    setSyncState("synced");
  }, [uid, getUserProfile]);

  const syncUserProfile = useCallback(async () => {
    if (!uid) return;
    await syncUserProfileRepo(uid);
    await getUserProfile();
  }, [uid, getUserProfile]);

  const changeUsername = useCallback(
    async (newUsername: string, password: string) => {
      if (!uid) return;
      await changeUsernameService({ uid, newUsername, password });
      await updateUserProfile({ username: newUsername });
    },
    [uid, updateUserProfile]
  );

  const changeEmail = useCallback(
    async (newEmail: string, password: string) => {
      if (!uid) return;
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
        setLanguage(newLang);
        return;
      }
      await updateUserProfile({ language: newLang });
      await updateUserLanguageInFirestore(uid, newLang);
      setLanguage(newLang);
    },
    [uid, updateUserProfile]
  );

  const exportUserData = useCallback(async (): Promise<string | void> => {
    if (!uid) return;
    return await exportUserDataRepo(uid);
  }, [uid]);

  const deleteUser = useCallback(async () => {
    if (!uid) return;
    await deleteUserInFirestoreWithUsername(uid);
    setUserData(null);
    setSyncState("pending");
  }, [uid]);

  return useMemo(
    () => ({
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
      exportUserData,
      language,
      changeLanguage,
    }),
    [
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
      exportUserData,
      language,
      changeLanguage,
    ]
  );
}
