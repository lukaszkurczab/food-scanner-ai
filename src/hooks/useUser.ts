import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserData } from "@/types";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  deleteDoc,
} from "@react-native-firebase/firestore";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import { savePhotoLocally } from "@utils/savePhotoLocally";
import {
  changeUsernameService,
  changeEmailService,
  changePasswordService,
} from "@/services/userService";

export function useUser(uid: string) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string>("en");

  useEffect(() => {
    if (!uid) {
      setUserData(null);
      setLanguage("en");
      setLoading(false);
      return;
    }
    const app = getApp();
    const db = getFirestore(app);
    const userRef = doc(db, "users", uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.data() as UserData | undefined;
      setUserData(data ?? null);
      if (data?.language) setLanguage(data.language);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const getUserProfile = useCallback(async () => {
    if (!uid) return null;
    const app = getApp();
    const db = getFirestore(app);
    const d = await getDoc(doc(db, "users", uid));
    const data = d.data() as UserData | undefined;
    return data ?? null;
  }, [uid]);

  const updateUserProfile = useCallback(
    async (patch: Partial<UserData>) => {
      if (!uid) return;
      const app = getApp();
      const db = getFirestore(app);
      const now = new Date().toISOString();
      await setDoc(
        doc(db, "users", uid),
        { ...patch, updatedAt: now },
        { merge: true }
      );
      if (patch.language) setLanguage(patch.language);
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
      const app = getApp();
      const st = getStorage(app);
      const r = ref(st, `avatars/${uid}.jpg`);
      await putFile(r, localPath);
      const url = await getDownloadURL(r);
      await updateUserProfile({ avatarUrl: url });
    },
    [uid, updateUserProfile]
  );

  const fetchUserFromCloud = useCallback(async () => {
    return await getUserProfile();
  }, [getUserProfile]);

  const sendUserToCloud = useCallback(async () => {
    await getUserProfile();
  }, [getUserProfile]);

  const syncUserProfile = useCallback(async () => {
    await getUserProfile();
  }, [getUserProfile]);

  const markUserAsSynced = useCallback(async () => {
    await getUserProfile();
  }, [getUserProfile]);

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
      setLanguage(newLang);
    },
    [uid, updateUserProfile]
  );

  const exportUserData = useCallback(async (): Promise<string | void> => {
    if (!uid) return;
    const data = await getUserProfile();
    return JSON.stringify({ user: data }, null, 2);
  }, [uid, getUserProfile]);

  const deleteUser = useCallback(async () => {
    if (!uid) return;
    const app = getApp();
    const db = getFirestore(app);
    await deleteDoc(doc(db, "users", uid));
    setUserData(null);
  }, [uid]);

  return useMemo(
    () => ({
      userData,
      loading,
      syncState: "synced" as const,
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
