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
import {
  sanitizeUserProfileLocalPatch,
  sanitizeUserProfilePatch,
} from "@/services/user/profilePatch";
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
  avatarUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const createAbortError = () => {
    const error = new Error("Avatar hydration aborted");
    error.name = "AbortError";
    return error;
  };
  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw createAbortError();
    }
  };
  const targetPath = avatarCachePath(uid);
  const tmpPath = `${targetPath}.tmp`;
  const dirPath = targetPath.slice(0, targetPath.lastIndexOf("/") + 1);

  throwIfAborted();

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

  let downloadResumable: ReturnType<typeof FileSystem.createDownloadResumable> | null =
    null;
  const onAbort = () => {
    if (!downloadResumable) return;
    void downloadResumable.pauseAsync().catch(() => {
      // Ignore pause failures while cancelling stale hydration.
    });
  };
  signal?.addEventListener("abort", onAbort);

  try {
    throwIfAborted();
    downloadResumable = FileSystem.createDownloadResumable(avatarUrl, tmpPath);
    const result = await downloadResumable.downloadAsync();
    throwIfAborted();
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

    throwIfAborted();
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
  } finally {
    signal?.removeEventListener("abort", onAbort);
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

const profileCacheLocks = new Map<string, Promise<void>>();

async function withProfileCacheLock<T>(
  uid: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = profileCacheLocks.get(uid) ?? Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  profileCacheLocks.set(uid, next);

  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
    if (profileCacheLocks.get(uid) === next) {
      profileCacheLocks.delete(uid);
    }
  }
}

function profileCacheKey(uid: string): string {
  return `user:profile:${uid}`;
}

async function readProfileCache(uid: string): Promise<UserData | null> {
  try {
    const cached = await AsyncStorage.getItem(profileCacheKey(uid));
    if (!cached) return null;
    return JSON.parse(cached) as UserData;
  } catch {
    return null;
  }
}

async function writeProfileCache(uid: string, profile: UserData): Promise<void> {
  try {
    await AsyncStorage.setItem(profileCacheKey(uid), JSON.stringify(profile));
  } catch {
    // Ignore cache write failures for profile mirror.
  }
}

async function mergeProfileCache(
  uid: string,
  patch: Record<string, unknown>
): Promise<void> {
  return withProfileCacheLock(uid, async () => {
    const cacheKey = profileCacheKey(uid);
    let parsedCurrent: Record<string, unknown> = {};

    try {
      const current = await AsyncStorage.getItem(cacheKey);
      if (current) {
        try {
          parsedCurrent = JSON.parse(current) as Record<string, unknown>;
        } catch {
          parsedCurrent = {};
        }
      }

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ ...parsedCurrent, ...patch })
      );
    } catch {
      // Ignore cache write failures for profile mirror.
    }
  });
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
  const avatarHydrationAbortControllerRef = useRef<AbortController | null>(null);
  const currentUidRef = useRef(uid);
  const lastSeenAvatarUrlRef = useRef<string>("");

  useEffect(() => {
    const uidChanged = currentUidRef.current !== uid;
    if (uidChanged) {
      avatarHydrationAbortControllerRef.current?.abort();
      avatarHydrationAbortControllerRef.current = null;
      avatarHydrationUrlRef.current = "";
      latestAvatarRequestUrlRef.current = "";
      lastSeenAvatarUrlRef.current = "";
    }

    currentUidRef.current = uid;
    if (!uid) {
      setSyncState("synced");
    }
  }, [uid]);

  useEffect(() => {
    return () => {
      avatarHydrationAbortControllerRef.current?.abort();
      avatarHydrationAbortControllerRef.current = null;
    };
  }, []);

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
    }: {
      avatarUrl: string | null | undefined;
    }) => {
      const requestUid = uid;
      if (!requestUid || !avatarUrl || !/^https?:\/\//i.test(avatarUrl)) return;
      if (
        avatarHydrationUrlRef.current === avatarUrl &&
        avatarHydrationAbortControllerRef.current &&
        !avatarHydrationAbortControllerRef.current.signal.aborted
      ) {
        return;
      }

      avatarHydrationAbortControllerRef.current?.abort();
      const controller = new AbortController();
      avatarHydrationAbortControllerRef.current = controller;

      latestAvatarRequestUrlRef.current = avatarUrl;
      avatarHydrationUrlRef.current = avatarUrl;
      try {
        const localPath = await cacheAvatarFromRemote(
          requestUid,
          avatarUrl,
          controller.signal
        );
        if (controller.signal.aborted) return;
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

        if (currentUidRef.current !== requestUid) return;
        if (latestAvatarRequestUrlRef.current !== avatarUrl) return;
        await mergeProfileCache(requestUid, { avatarLocalPath: existingPath });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        // Keep fallback rendering when remote hydration fails.
      } finally {
        if (avatarHydrationAbortControllerRef.current === controller) {
          avatarHydrationAbortControllerRef.current = null;
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
    }: {
      avatarUrl?: string;
      avatarLocalPath: string;
    }) => {
      const nextUrl = avatarUrl || "";
      const prevUrl = lastSeenAvatarUrlRef.current;
      const urlChanged = !!nextUrl && !!prevUrl && prevUrl !== nextUrl;

      lastSeenAvatarUrlRef.current = nextUrl;

      if (nextUrl && (!avatarLocalPath || urlChanged)) {
        void hydrateAvatarFromRemote({
          avatarUrl: nextUrl,
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

    (async () => {
      try {
        const parsed = await readProfileCache(uid);
        if (parsed) {
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
          });
          if ((parsed.avatarLocalPath || "") !== avatarLocalPath) {
            void writeProfileCache(uid, normalized);
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
        });
        void writeProfileCache(uid, normalized);
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
    const readCached = async () => {
      try {
        const parsed = await readProfileCache(uid);
        if (!parsed) return null;
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
      });
      void writeProfileCache(uid, normalized);
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
      const localPatch = sanitizeUserProfileLocalPatch(patch);
      const payload = sanitizeUserProfilePatch(patch);
      assertNoUndefined(payload, "updateUserProfile payload");

      setUserData((prev) =>
        prev ? { ...prev, ...localPatch } : ({ uid, ...localPatch } as UserData)
      );
      if (localPatch.language) {
        const nextLanguage = normalizeLanguageCode(localPatch.language);
        setLanguage(nextLanguage);
        i18n.changeLanguage(nextLanguage).catch(() => {
          // Ignore language persistence errors from i18n detector.
        });
      }

      await mergeProfileCache(uid, localPatch as Record<string, unknown>);

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

      await mergeProfileCache(uid, patch as Record<string, unknown>);
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

  const syncUserProfile = useCallback(async () => {
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
    try {
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
    } finally {
      FileSystem.deleteAsync(tmpPdf, { idempotent: true }).catch(() => {
        // Ignore tmp cleanup failures for export flow.
      });
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
      syncUserProfile,
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
      syncUserProfile,
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
