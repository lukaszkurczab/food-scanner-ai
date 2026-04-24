import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UserData } from "@/types";
import { assertNoUndefined } from "@/utils/findUndefined";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "@/services/core/fileSystem";
import { emit, on } from "@/services/core/events";
import { isOfflineNetState } from "@/services/core/networkState";
import {
  emitUserProfileChanged,
  fetchUserProfileRemote,
  subscribeToUserProfile,
} from "@/services/user/userProfileRepository";
import {
  getSyncCounts,
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
import { logError, logWarning } from "@/services/core/errorLogger";

const PROFILE_SYNC_KINDS: QueueKind[] = [
  "update_user_profile",
  "upload_user_avatar",
];

export function normalizeLanguageCode(
  language: string | null | undefined
): "en" | "pl" {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  return "en";
}

const profileCacheLocks = new Map<string, Promise<void>>();

const isLocalUri = (value: string | null | undefined): value is string =>
  !!value &&
  (value.startsWith("file://") || value.startsWith("content://"));

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

  await previous.catch((error) => {
    logWarning("profile cache lock wait failed", null, error);
  });
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

function avatarCachePath(uid: string): string {
  return `${FileSystem.documentDirectory}users/${uid}/images/avatar.jpg`;
}

async function readProfileCache(uid: string): Promise<UserData | null> {
  try {
    const cached = await AsyncStorage.getItem(profileCacheKey(uid));
    if (!cached) return null;
    return JSON.parse(cached) as UserData;
  } catch (error) {
    logWarning("profile cache read failed", null, error);
    return null;
  }
}

async function writeProfileCache(uid: string, profile: UserData): Promise<void> {
  try {
    await AsyncStorage.setItem(profileCacheKey(uid), JSON.stringify(profile));
  } catch (error) {
    logWarning("profile cache write failed", null, error);
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
        } catch (error) {
          logWarning("profile cache parse failed", null, error);
          parsedCurrent = {};
        }
      }

      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({ ...parsedCurrent, ...patch })
      );
    } catch (error) {
      logWarning("profile cache merge write failed", null, error);
    }
  });
}

async function resolveExistingAvatarPath(
  ...paths: Array<string | null | undefined>
): Promise<string> {
  for (const path of paths) {
    if (!isLocalUri(path)) continue;
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) return path;
    } catch (error) {
      logWarning("avatar path check failed", { path }, error);
      continue;
    }
  }
  return "";
}

type SyncState = "synced" | "pending" | "conflict";

type UseUserProfileResult = {
  userData: UserData | null;
  loading: boolean;
  syncState: SyncState;
  retryingProfileSync: boolean;
  language: string;
  getUserProfile: () => Promise<UserData | null>;
  fetchUserFromCloud: () => Promise<UserData | null>;
  updateUserProfile: (patch: Partial<UserData>) => Promise<void>;
  syncUserProfile: () => Promise<void>;
  retryProfileSync: () => Promise<void>;
  mirrorProfileLocally: (patch: Partial<UserData>) => Promise<void>;
  refreshProfileSyncState: () => Promise<void>;
  pushPendingChanges: () => Promise<void>;
  setUserData: Dispatch<SetStateAction<UserData | null>>;
  setLanguage: Dispatch<SetStateAction<string>>;
};

export function useUserProfile(uid: string): UseUserProfileResult {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>("synced");
  const [retryingProfileSync, setRetryingProfileSync] = useState(false);
  const [language, setLanguage] = useState<string>(() =>
    normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language)
  );
  const userDataRef = useRef<UserData | null>(null);

  useEffect(() => {
    if (!uid) {
      setSyncState("synced");
    }
  }, [uid]);

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const applyProfileData = useCallback(
    async (
      profile: UserData | null,
      options?: {
        emitChange?: boolean;
        writeCache?: boolean;
      },
    ): Promise<UserData | null> => {
      if (!uid) return null;

      if (!profile) {
        setUserData(null);
        userDataRef.current = null;
        setLoading(false);
        if (options?.emitChange) {
          emitUserProfileChanged(uid, null);
        }
        return null;
      }

      const currentAvatarLocalPath =
        userDataRef.current?.uid === uid
          ? userDataRef.current.avatarLocalPath
          : undefined;
      const avatarLocalPath = await resolveExistingAvatarPath(
        profile.avatarLocalPath,
        currentAvatarLocalPath,
        avatarCachePath(uid)
      );
      const normalized = { ...profile, avatarLocalPath };
      setUserData(normalized);
      userDataRef.current = normalized;
      setLoading(false);
      if (
        options?.writeCache ||
        (profile.avatarLocalPath || "") !== avatarLocalPath
      ) {
        void writeProfileCache(uid, normalized);
      }
      if (options?.emitChange) {
        emitUserProfileChanged(uid, normalized);
      }
      return normalized;
    },
    [uid],
  );

  const refreshProfileSyncState = useCallback(async () => {
    if (!uid) {
      setSyncState("synced");
      return;
    }
    try {
      const { dead, pending } = await getSyncCounts(uid, {
        kinds: PROFILE_SYNC_KINDS,
      });
      setSyncState(dead > 0 ? "conflict" : pending > 0 ? "pending" : "synced");
    } catch (error) {
      logWarning("profile sync state refresh failed", null, error);
    }
  }, [uid]);

  const fetchUserFromCloud = useCallback(async () => {
    if (!uid) return null;
    const readCached = async () => {
      try {
        const parsed = await readProfileCache(uid);
        if (!parsed) return null;
        const currentAvatarLocalPath =
          userDataRef.current?.uid === uid
            ? userDataRef.current.avatarLocalPath
            : undefined;
        const avatarLocalPath = await resolveExistingAvatarPath(
          parsed.avatarLocalPath,
          currentAvatarLocalPath,
          avatarCachePath(uid)
        );
        const normalized = { ...parsed, avatarLocalPath };
        setUserData(normalized);
        userDataRef.current = normalized;
        if ((parsed.avatarLocalPath || "") !== avatarLocalPath) {
          void writeProfileCache(uid, normalized);
        }
        return normalized;
      } catch (error) {
        logWarning("profile cache fallback read failed", null, error);
        return null;
      }
    };

    const net = await NetInfo.fetch();
    if (isOfflineNetState(net)) {
      const cached = (await readCached()) || userDataRef.current;
      if (!cached) setLoading(false);
      return cached;
    }
    try {
      const data = await fetchUserProfileRemote();
      if (!data && userDataRef.current?.uid === uid) {
        setLoading(false);
        return userDataRef.current;
      }
      return applyProfileData(data, { emitChange: true, writeCache: !!data });
    } catch (error) {
      logWarning("user profile remote fetch failed", null, error);
      const cached = (await readCached()) || userDataRef.current;
      if (!cached) setLoading(false);
      return cached;
    }
  }, [applyProfileData, uid]);

  const getUserProfile = useCallback(async () => {
    return userData;
  }, [userData]);

  const pushPendingChanges = useCallback(async () => {
    setSyncState("pending");
    const net = await NetInfo.fetch();
    if (isOfflineNetState(net)) return;
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
        i18n.changeLanguage(nextLanguage).catch((error) => {
          logWarning("language change failed", null, error);
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
      if (retried > 0 && !isOfflineNetState(net)) {
        await pushQueue(uid);
      }
      await refreshProfileSyncState();
    } catch (error) {
      logError("profile sync retry failed", null, error);
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

  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      setUserData(null);
      setLanguage(normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language));
      setLoading(false);
      return;
    }

    const unsub = subscribeToUserProfile({
      uid,
      onData: (data) => {
        void applyProfileData(data, { writeCache: !!data });
      },
    });

    void (async () => {
      try {
        const parsed = await readProfileCache(uid);
        if (parsed) {
          if (cancelled) return;
          await applyProfileData(parsed, { emitChange: true });
        }
      } catch (error) {
        logWarning("profile cache hydration failed", null, error);
      }

      if (cancelled) return;
      await fetchUserFromCloud();
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [applyProfileData, fetchUserFromCloud, uid]);

  useEffect(() => {
    void refreshProfileSyncState();
  }, [refreshProfileSyncState]);

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
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [uid, refreshProfileSyncState]);

  return useMemo(
    () => ({
      userData,
      loading,
      syncState,
      retryingProfileSync,
      language,
      getUserProfile,
      fetchUserFromCloud,
      updateUserProfile,
      syncUserProfile,
      retryProfileSync,
      mirrorProfileLocally,
      refreshProfileSyncState,
      pushPendingChanges,
      setUserData,
      setLanguage,
    }),
    [
      userData,
      loading,
      syncState,
      retryingProfileSync,
      language,
      getUserProfile,
      fetchUserFromCloud,
      updateUserProfile,
      syncUserProfile,
      retryProfileSync,
      mirrorProfileLocally,
      refreshProfileSyncState,
      pushPendingChanges,
      setUserData,
      setLanguage,
    ]
  );
}
