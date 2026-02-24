import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { assertNoUndefined } from "@/utils/findUndefined";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

const isLocalUri = (value: string | null | undefined): value is string =>
  !!value &&
  (value.startsWith("file://") || value.startsWith("content://"));

function avatarCachePath(uid: string): string {
  return `${FileSystem.documentDirectory}users/${uid}/images/avatar.jpg`;
}

async function cacheAvatarFromRemote(
  uid: string,
  avatarUrl: string
): Promise<string> {
  const targetPath = avatarCachePath(uid);
  const tmpPath = `${targetPath}.tmp`;
  const dirPath = targetPath.slice(0, targetPath.lastIndexOf("/") + 1);

  const dirInfo = await FileSystem.getInfoAsync(dirPath);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }

  try {
    const tmpInfo = await FileSystem.getInfoAsync(tmpPath);
    if (tmpInfo.exists) {
      await FileSystem.deleteAsync(tmpPath, { idempotent: true });
    }
  } catch {
    // Ignore stale tmp cleanup failures.
  }

  try {
    const dl = FileSystem.createDownloadResumable(avatarUrl, tmpPath);
    const result = await dl.downloadAsync();
    const ok = !!result && result.status >= 200 && result.status < 300;
    if (!ok) {
      throw new Error("Avatar download failed");
    }

    try {
      const targetInfo = await FileSystem.getInfoAsync(targetPath);
      if (targetInfo.exists) {
        await FileSystem.deleteAsync(targetPath, { idempotent: true });
      }
    } catch {
      // Ignore stale target cleanup failures.
    }

    await FileSystem.moveAsync({ from: tmpPath, to: targetPath });
    return targetPath;
  } catch (error) {
    try {
      const tmpInfo = await FileSystem.getInfoAsync(tmpPath);
      if (tmpInfo.exists) {
        await FileSystem.deleteAsync(tmpPath, { idempotent: true });
      }
    } catch {
      // Ignore tmp cleanup failures on failed download.
    }
    throw error;
  }
}

async function resolveExistingAvatarPath(
  ...paths: Array<string | null | undefined>
): Promise<string> {
  for (const path of paths) {
    if (!isLocalUri(path)) continue;
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return path;
    } catch {
      continue;
    }
  }
  return "";
}

export function useUser(uid: string) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string>("en");
  const avatarLocalPathRef = useRef<string>("");
  const userDataRef = useRef<UserData | null>(null);
  const avatarHydrationUrlRef = useRef<string>("");
  const latestAvatarRequestUrlRef = useRef<string>("");
  const currentUidRef = useRef(uid);
  const lastSeenAvatarUrlRef = useRef<string>("");

  useEffect(() => {
    currentUidRef.current = uid;
    if (!uid) {
      avatarHydrationUrlRef.current = "";
      latestAvatarRequestUrlRef.current = "";
      lastSeenAvatarUrlRef.current = "";
    }
  }, [uid]);

  const hydrateAvatarFromRemote = useCallback(
    async ({
      avatarUrl,
      cacheKey,
    }: {
      avatarUrl: string | null | undefined;
      cacheKey: string;
    }) => {
      const requestUid = uid;
      if (!requestUid || !avatarUrl || !/^https?:\/\//i.test(avatarUrl)) return;
      if (avatarHydrationUrlRef.current === avatarUrl) return;

      latestAvatarRequestUrlRef.current = avatarUrl;
      avatarHydrationUrlRef.current = avatarUrl;
      try {
        const localPath = await cacheAvatarFromRemote(requestUid, avatarUrl);
        const existingPath = await resolveExistingAvatarPath(localPath);
        if (!existingPath) return;
        if (currentUidRef.current !== requestUid) return;
        if (latestAvatarRequestUrlRef.current !== avatarUrl) return;

        avatarLocalPathRef.current = existingPath;
        setUserData((prev) =>
          prev && prev.uid === requestUid
            ? { ...prev, avatarLocalPath: existingPath }
            : prev
        );

        try {
          const current = await AsyncStorage.getItem(cacheKey);
          if (currentUidRef.current !== requestUid) return;
          if (latestAvatarRequestUrlRef.current !== avatarUrl) return;
          const parsedCurrent = current
            ? (JSON.parse(current) as Record<string, unknown>)
            : {};
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({ ...parsedCurrent, avatarLocalPath: existingPath })
          );
        } catch {
          // Ignore cache mirror failures for avatar hydration.
        }
      } catch {
        // Keep fallback rendering when remote hydration fails.
      } finally {
        if (avatarHydrationUrlRef.current === avatarUrl) {
          avatarHydrationUrlRef.current = "";
        }
      }
    },
    [uid]
  );

  const maybeHydrateAvatar = useCallback(
    ({
      avatarUrl,
      avatarLocalPath,
      cacheKey,
    }: {
      avatarUrl?: string;
      avatarLocalPath: string;
      cacheKey: string;
    }) => {
      const nextUrl = avatarUrl || "";
      const prevUrl = lastSeenAvatarUrlRef.current;
      const urlChanged = !!nextUrl && !!prevUrl && prevUrl !== nextUrl;

      lastSeenAvatarUrlRef.current = nextUrl;

      if (nextUrl && (!avatarLocalPath || urlChanged)) {
        void hydrateAvatarFromRemote({
          avatarUrl: nextUrl,
          cacheKey,
        });
      }
    },
    [hydrateAvatarFromRemote]
  );

  useEffect(() => {
    avatarLocalPathRef.current = userData?.avatarLocalPath || "";
    userDataRef.current = userData;
  }, [userData]);

  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      setUserData(null);
      setLanguage("en");
      setLoading(false);
      avatarLocalPathRef.current = "";
      return;
    }

    const cacheKey = `user:profile:${uid}`;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as UserData;
          const avatarLocalPath = await resolveExistingAvatarPath(
            parsed.avatarLocalPath
          );
          const normalized = { ...parsed, avatarLocalPath };
          if (cancelled) return;
          setUserData(normalized);
          avatarLocalPathRef.current = avatarLocalPath;
          if (normalized.language) setLanguage(normalized.language);
          setLoading(false);
          maybeHydrateAvatar({
            avatarUrl: normalized.avatarUrl,
            avatarLocalPath,
            cacheKey,
          });
          if ((parsed.avatarLocalPath || "") !== avatarLocalPath) {
            AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(
              () => {}
            );
          }
        }
      } catch {
        // Ignore malformed local cache and continue with remote snapshot.
      }
    })();
    const app = getApp();
    const db = getFirestore(app);
    const userRef = doc(db, "users", uid);

    const unsub = onSnapshot(userRef, (snap) => {
      const data = (snap.data() as UserData | undefined) ?? null;
      if (!data) {
        if (!cancelled) {
          setUserData(null);
          setLoading(false);
        }
        return;
      }
      void (async () => {
        const avatarLocalPath = await resolveExistingAvatarPath(
          avatarLocalPathRef.current,
          data.avatarLocalPath
        );
        const normalized = { ...data, avatarLocalPath };
        if (cancelled) return;
        setUserData(normalized);
        avatarLocalPathRef.current = avatarLocalPath;
        if (normalized.language) setLanguage(normalized.language);
        setLoading(false);
        maybeHydrateAvatar({
          avatarUrl: normalized.avatarUrl,
          avatarLocalPath,
          cacheKey,
        });
        AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(
          () => {}
        );
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid, maybeHydrateAvatar]);

  const getUserProfile = useCallback(async () => {
    return userData;
  }, [userData]);

  const fetchUserFromCloud = useCallback(async () => {
    if (!uid) return null;
    const cacheKey = `user:profile:${uid}`;
    const readCached = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (!cached) return null;
        const parsed = JSON.parse(cached) as UserData;
        const avatarLocalPath = await resolveExistingAvatarPath(
          avatarLocalPathRef.current,
          parsed.avatarLocalPath
        );
        const normalized = { ...parsed, avatarLocalPath };
        setUserData(normalized);
        avatarLocalPathRef.current = avatarLocalPath;
        userDataRef.current = normalized;
        if (normalized.language) setLanguage(normalized.language);
        maybeHydrateAvatar({
          avatarUrl: normalized.avatarUrl,
          avatarLocalPath,
          cacheKey,
        });
        return normalized;
      } catch {
        return null;
      }
    };

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      return (await readCached()) || userDataRef.current;
    }

    const app = getApp();
    const db = getFirestore(app);
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const data = (snap.data() as UserData | undefined) ?? null;
      if (!data) return (await readCached()) || null;
      const avatarLocalPath = await resolveExistingAvatarPath(
        avatarLocalPathRef.current,
        data.avatarLocalPath
      );
      const normalized = { ...data, avatarLocalPath };
      setUserData(normalized);
      avatarLocalPathRef.current = avatarLocalPath;
      userDataRef.current = normalized;
      if (normalized.language) setLanguage(normalized.language);
      maybeHydrateAvatar({
        avatarUrl: normalized.avatarUrl,
        avatarLocalPath,
        cacheKey,
      });
      AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(() => {});
      return normalized;
    } catch {
      return (await readCached()) || userDataRef.current;
    }
  }, [uid, maybeHydrateAvatar]);

  const updateUserProfile = useCallback(
    async (patch: Partial<UserData>) => {
      if (!uid) return;
      const app = getApp();
      const db = getFirestore(app);
      const now = new Date().toISOString();
      const payload: Partial<UserData> & { updatedAt: string } = {
        ...patch,
        updatedAt: now,
      };
      if ("avatarLocalPath" in patch) {
        payload.avatarLocalPath = patch.avatarLocalPath ?? "";
      }
      assertNoUndefined(payload, "updateUserProfile payload");
      await setDoc(doc(db, "users", uid), payload, { merge: true });
      setUserData((prev) => (prev ? { ...prev, ...payload } : prev));
      if (patch.language) setLanguage(patch.language);

      try {
        const current = await AsyncStorage.getItem(`user:profile:${uid}`);
        const parsedCurrent = current
          ? (JSON.parse(current) as Record<string, unknown>)
          : {};
        const merged = {
          ...parsedCurrent,
          ...patch,
          updatedAt: now,
        };
        await AsyncStorage.setItem(
          `user:profile:${uid}`,
          JSON.stringify(merged)
        );
      } catch {
        // Ignore cache write failures for profile mirror.
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

      setUserData((prev) =>
        prev ? { ...prev, avatarLocalPath: localPath } : prev
      );
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        await updateUserProfile({ avatarLocalPath: localPath });
        return;
      }
      const app = getApp();
      const st = getStorage(app);
      const r = ref(st, `avatars/${uid}/avatar.jpg`);
      await putFile(r, localPath, { contentType: "image/jpeg" });
      const url = await getDownloadURL(r);
      lastSeenAvatarUrlRef.current = url;
      await updateUserProfile({ avatarUrl: url, avatarLocalPath: localPath });
      setUserData((prev) =>
        prev ? { ...prev, avatarUrl: url, avatarLocalPath: localPath } : prev
      );
    },
    [uid, updateUserProfile]
  );

  const sendUserToCloud = useCallback(async () => {
    await fetchUserFromCloud();
  }, [fetchUserFromCloud]);

  const syncUserProfile = useCallback(async () => {
    await fetchUserFromCloud();
  }, [fetchUserFromCloud]);

  const markUserAsSynced = useCallback(async () => {
    await fetchUserFromCloud();
  }, [fetchUserFromCloud]);

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
    const json = JSON.stringify({ user: data }, null, 2);

    const html = `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <style>
            body { font-family: -apple-system, Roboto, Inter, Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 12px 0; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 12px; background: #f5f5f5; padding: 12px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>CaloriAI – User Data Export</h1>
          <pre>${json
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</pre>
        </body>
      </html>`;

    const { uri: tmpPdf } = await Print.printToFileAsync({ html });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `caloriai_user_data_${yyyy}-${mm}-${dd}.pdf`;

    if (Platform.OS === "android" && FileSystem.StorageAccessFramework) {
      try {
        const perm =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (perm.granted && perm.directoryUri) {
          const fileUri =
            await FileSystem.StorageAccessFramework.createFileAsync(
              perm.directoryUri,
              filename,
              "application/pdf"
            );
          const pdfBase64 = await FileSystem.readAsStringAsync(tmpPdf, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "CaloriAI – PDF",
          });
          return fileUri;
        } else {
          const fallback = FileSystem.documentDirectory! + filename;
          await FileSystem.copyAsync({ from: tmpPdf, to: fallback });
          await Sharing.shareAsync(fallback, {
            mimeType: "application/pdf",
            dialogTitle: "CaloriAI – PDF",
          });
          return fallback;
        }
      } catch {
        const fallback = FileSystem.documentDirectory! + filename;
        await FileSystem.copyAsync({ from: tmpPdf, to: fallback });
        await Sharing.shareAsync(fallback, {
          mimeType: "application/pdf",
          dialogTitle: "CaloriAI – PDF",
        });
        return fallback;
      }
    } else {
      const dest = FileSystem.documentDirectory! + filename;
      await FileSystem.copyAsync({ from: tmpPdf, to: dest });
      await Sharing.shareAsync(dest, {
        mimeType: "application/pdf",
        dialogTitle: "CaloriAI – PDF",
      });
      return dest;
    }
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
