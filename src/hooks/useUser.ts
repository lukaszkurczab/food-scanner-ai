import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserData } from "@/types";
import { savePhotoLocally } from "@utils/savePhotoLocally";
import {
  changeUsernameService,
  changeEmailService,
  changePasswordService,
  deleteAccountService,
  exportUserData as fetchUserExportData,
} from "@/services/user/userService";
import { assertNoUndefined } from "@/utils/findUndefined";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { emit, on } from "@/services/core/events";
import {
  fetchUserProfileRemote,
  subscribeToUserProfile,
} from "@/services/user/userProfileRepository";
import {
  getSyncCounts,
  enqueueUserAvatarUpload,
  enqueueUserProfileUpdate,
  retryDeadLetterOps,
} from "@/services/offline/queue.repo";
import { pushQueue } from "@/services/offline/sync.engine";
import { sanitizeUserProfilePatch } from "@/services/user/profilePatch";
import i18n from "@/i18n";
import type { QueueKind } from "@/services/offline/queue.repo";

const PROFILE_SYNC_KINDS: QueueKind[] = [
  "update_user_profile",
  "upload_user_avatar",
];

const isLocalUri = (value: string | null | undefined): value is string =>
  !!value &&
  (value.startsWith("file://") || value.startsWith("content://"));

function normalizeLanguageCode(language: string | null | undefined): "en" | "pl" {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  return "en";
}

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
  const [syncState, setSyncState] = useState<"synced" | "pending" | "conflict">(
    "synced",
  );
  const [retryingProfileSync, setRetryingProfileSync] = useState(false);
  const [language, setLanguage] = useState<string>(() =>
    normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language)
  );
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
      setSyncState("synced");
    }
  }, [uid]);

  const refreshProfileSyncState = useCallback(async () => {
    if (!uid) {
      setSyncState("synced");
      return;
    }
    try {
      const { dead, pending } = await getSyncCounts(uid, { kinds: PROFILE_SYNC_KINDS });
      setSyncState(dead > 0 ? "conflict" : pending > 0 ? "pending" : "synced");
    } catch {
      // Keep previous sync state if local queue inspection fails.
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
      setLanguage(normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language));
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
    const unsub = subscribeToUserProfile({
      uid,
      onData: (data) => {
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
      },
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [uid, maybeHydrateAvatar]);

  useEffect(() => {
    void refreshProfileSyncState();
  }, [refreshProfileSyncState]);

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
    try {
      const data = await fetchUserProfileRemote(uid);
      if (!data) return (await readCached()) || null;
      const avatarLocalPath = await resolveExistingAvatarPath(
        avatarLocalPathRef.current,
        data.avatarLocalPath
      );
      const normalized = { ...data, avatarLocalPath };
      setUserData(normalized);
      avatarLocalPathRef.current = avatarLocalPath;
      userDataRef.current = normalized;
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

  const pushPendingChanges = useCallback(async () => {
    setSyncState("pending");
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    await pushQueue(uid);
    await refreshProfileSyncState();
  }, [uid, refreshProfileSyncState]);

  const updateUserProfile = useCallback(
    async (patch: Partial<UserData>) => {
      if (!uid) return;
      const payload = sanitizeUserProfilePatch(patch);
      assertNoUndefined(payload, "updateUserProfile payload");

      setUserData((prev) =>
        prev ? { ...prev, ...patch } : ({ uid, ...patch } as UserData)
      );
      if (patch.language) {
        const nextLanguage = normalizeLanguageCode(patch.language);
        setLanguage(nextLanguage);
        i18n.changeLanguage(nextLanguage).catch(() => {
          // Ignore language persistence errors from i18n detector.
        });
      }

      try {
        const current = await AsyncStorage.getItem(`user:profile:${uid}`);
        const parsedCurrent = current
          ? (JSON.parse(current) as Record<string, unknown>)
          : {};
        const merged = {
          ...parsedCurrent,
          ...patch,
        };
        await AsyncStorage.setItem(
          `user:profile:${uid}`,
          JSON.stringify(merged)
        );
      } catch {
        // Ignore cache write failures for profile mirror.
      }

      if (Object.keys(payload).length === 0) return;
      await enqueueUserProfileUpdate(uid, payload, {
        updatedAt: new Date().toISOString(),
      });
      await pushPendingChanges();
    },
    [uid, pushPendingChanges]
  );

  const mirrorProfileLocally = useCallback(
    async (patch: Partial<UserData>) => {
      if (!uid) return;
      setUserData((prev) =>
        prev ? { ...prev, ...patch } : ({ uid, ...patch } as UserData)
      );

      try {
        const current = await AsyncStorage.getItem(`user:profile:${uid}`);
        const parsedCurrent = current
          ? (JSON.parse(current) as Record<string, unknown>)
          : {};
        await AsyncStorage.setItem(
          `user:profile:${uid}`,
          JSON.stringify({ ...parsedCurrent, ...patch })
        );
      } catch {
        // Ignore cache write failures for profile mirror.
      }
    },
    [uid]
  );

  useEffect(() => {
    if (!uid) return;
    const unsub = on<{
      uid?: string;
      avatarUrl?: string;
      avatarLocalPath?: string;
      avatarlastSyncedAt?: string;
    }>("user:avatar:synced", (payload) => {
      if (!payload || payload.uid !== uid) return;
      if (payload.avatarUrl) {
        lastSeenAvatarUrlRef.current = payload.avatarUrl;
      }
      void mirrorProfileLocally({
        avatarUrl: payload.avatarUrl || "",
        avatarLocalPath: payload.avatarLocalPath || "",
        avatarlastSyncedAt: payload.avatarlastSyncedAt || "",
      });
      void refreshProfileSyncState();
    });
    return () => {
      unsub();
    };
  }, [uid, mirrorProfileLocally, refreshProfileSyncState]);

  useEffect(() => {
    if (!uid) return;
    const handler = (payload: { uid?: string } | undefined) => {
      if (!payload || payload.uid !== uid) return;
      void refreshProfileSyncState();
    };
    const unsubs = ([
      "user:profile:synced",
      "user:profile:failed",
      "user:avatar:failed",
      "sync:op:retried",
    ] as const).map((event) => on<{ uid?: string }>(event, handler));
    return () => { unsubs.forEach((u) => u()); };
  }, [uid, refreshProfileSyncState]);

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
      avatarLocalPathRef.current = localPath;
      await mirrorProfileLocally({ avatarLocalPath: localPath });
      await enqueueUserAvatarUpload(uid, {
        localPath,
        updatedAt: new Date().toISOString(),
      });
      try {
        await pushPendingChanges();
      } catch {
        // Keep optimistic local avatar while upload retries in queue.
      }
    },
    [uid, mirrorProfileLocally, pushPendingChanges]
  );

  const retryProfileSync = useCallback(async () => {
    if (!uid || retryingProfileSync) return;
    setRetryingProfileSync(true);
    try {
      const retried = await retryDeadLetterOps({
        uid,
        kinds: PROFILE_SYNC_KINDS,
      });
      if (retried > 0) {
        setSyncState("pending");
      }
      const net = await NetInfo.fetch();
      if (retried > 0 && net.isConnected) {
        await pushQueue(uid);
      }
      await refreshProfileSyncState();
    } catch {
      emit("ui:toast", {
        text: i18n.t("common:unknownError"),
      });
    } finally {
      setRetryingProfileSync(false);
    }
  }, [retryingProfileSync, uid, refreshProfileSyncState]);

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
      await mirrorProfileLocally({ username: newUsername });
    },
    [uid, mirrorProfileLocally]
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
      const nextLanguage = normalizeLanguageCode(newLang);
      setLanguage(nextLanguage);
      await i18n.changeLanguage(nextLanguage);
      if (!uid) return;
      await mirrorProfileLocally({ language: nextLanguage });
      await enqueueUserProfileUpdate(uid, { language: nextLanguage }, {
        updatedAt: new Date().toISOString(),
      });
      await pushPendingChanges();
    },
    [mirrorProfileLocally, uid, pushPendingChanges]
  );

  const exportUserData = useCallback(async (): Promise<string | void> => {
    if (!uid) return;
    const data = await fetchUserExportData(uid);
    const json = JSON.stringify(data, null, 2);

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
          <h1>Fitaly – User Data Export</h1>
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
    const filename = `fitaly_user_data_${yyyy}-${mm}-${dd}.pdf`;

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
            dialogTitle: "Fitaly – PDF",
          });
          return fileUri;
        } else {
          const fallback = FileSystem.documentDirectory! + filename;
          await FileSystem.copyAsync({ from: tmpPdf, to: fallback });
          await Sharing.shareAsync(fallback, {
            mimeType: "application/pdf",
            dialogTitle: "Fitaly – PDF",
          });
          return fallback;
        }
      } catch {
        const fallback = FileSystem.documentDirectory! + filename;
        await FileSystem.copyAsync({ from: tmpPdf, to: fallback });
        await Sharing.shareAsync(fallback, {
          mimeType: "application/pdf",
          dialogTitle: "Fitaly – PDF",
        });
        return fallback;
      }
    } else {
      const dest = FileSystem.documentDirectory! + filename;
      await FileSystem.copyAsync({ from: tmpPdf, to: dest });
      await Sharing.shareAsync(dest, {
        mimeType: "application/pdf",
        dialogTitle: "Fitaly – PDF",
      });
      return dest;
    }
  }, [uid]);

  const deleteUser = useCallback(async (password?: string) => {
    if (!uid) return;
    await deleteAccountService({ uid, password: password || "" });
    setUserData(null);
  }, [uid]);

  return useMemo(
    () => ({
      userData,
      loading,
      syncState,
      retryingProfileSync,
      getUserProfile,
      fetchUserFromCloud,
      updateUserProfile,
      sendUserToCloud,
      syncUserProfile,
      markUserAsSynced,
      retryProfileSync,
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
      retryingProfileSync,
      getUserProfile,
      fetchUserFromCloud,
      updateUserProfile,
      sendUserToCloud,
      syncUserProfile,
      markUserAsSynced,
      retryProfileSync,
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
