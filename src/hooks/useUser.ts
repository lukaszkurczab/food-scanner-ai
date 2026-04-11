import { useMemo } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserAvatar } from "@/hooks/useUserAvatar";
import { useUserAccount } from "@/hooks/useUserAccount";
import { useUserExport } from "@/hooks/useUserExport";

export function useUser(uid: string) {
  const {
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
  } = useUserProfile(uid);

  const avatar = useUserAvatar({
    uid,
    userData,
    setUserData,
    mirrorProfileLocally,
    pushPendingChanges,
    refreshProfileSyncState,
  });

  const account = useUserAccount({
    uid,
    setUserData,
    mirrorProfileLocally,
  });

  const exportAndPrefs = useUserExport({
    uid,
    setLanguage,
    mirrorProfileLocally,
    pushPendingChanges,
  });

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
      ...avatar,
      ...account,
      ...exportAndPrefs,
      language,
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
      avatar,
      account,
      exportAndPrefs,
      language,
    ]
  );
}
