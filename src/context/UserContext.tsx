import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useAuthContext } from "./AuthContext";
import { useUser } from "@hooks/useUser";
import type { UserData } from "@/types";

import { runMigrations } from "@/services/offline/db";
import { startSyncLoop, stopSyncLoop } from "@/services/offline/sync.engine";
import { cleanupTransientOfflineAssets } from "@/services/offline/fileCleanup";

export type UserContextType = {
  userData: UserData | null;
  loadingUser: boolean;
  syncState: "synced" | "pending" | "conflict";
  retryingProfileSync: boolean;
  refreshUser: () => Promise<UserData | null>;
  getUserData: () => Promise<UserData | null>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  retryProfileSync: () => Promise<void>;
  syncUserProfile: () => Promise<void>;
  deleteUser: (password?: string) => Promise<void>;
  setAvatar: (photoUri: string) => Promise<void>;
  changeUsername: (newUsername: string, password: string) => Promise<void>;
  changeEmail: (newEmail: string, password: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  exportUserData: () => Promise<string | void>;
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userData: null,
  loadingUser: true,
  syncState: "pending",
  retryingProfileSync: false,
  getUserData: async () => null,
  refreshUser: async () => null,
  updateUser: async () => {},
  retryProfileSync: async () => {},
  syncUserProfile: async () => {},
  deleteUser: async () => {},
  setAvatar: async () => {},
  changeUsername: async () => {},
  changeEmail: async () => {},
  changePassword: async () => {},
  exportUserData: async () => {},
  language: "en",
  changeLanguage: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser: authUser } = useAuthContext();
  const uid = authUser?.uid || "";

  const {
    userData,
    loading: loadingUser,
    syncState,
    retryingProfileSync,
    getUserProfile,
    fetchUserFromCloud,
    updateUserProfile,
    retryProfileSync,
    syncUserProfile,
    deleteUser,
    setAvatar,
    changeUsername,
    changeEmail,
    changePassword,
    exportUserData,
    language,
    changeLanguage,
  } = useUser(uid);

  const refreshUser = useCallback(async () => {
    return fetchUserFromCloud();
  }, [fetchUserFromCloud]);

  useEffect(() => {
    try {
      runMigrations();
    } catch {
      // Migration bootstrap is best-effort.
    }
    void cleanupTransientOfflineAssets();
  }, []);

  useEffect(() => {
    if (!uid) {
      stopSyncLoop();
      return;
    }
    startSyncLoop(uid);
    return () => {
      stopSyncLoop();
    };
  }, [uid]);

  return (
    <UserContext.Provider
      value={{
        userData,
        loadingUser,
        syncState,
        retryingProfileSync,
        refreshUser,
        getUserData: getUserProfile,
        updateUser: updateUserProfile,
        retryProfileSync,
        syncUserProfile,
        deleteUser,
        setAvatar,
        changeUsername,
        changeEmail,
        changePassword,
        exportUserData,
        language,
        changeLanguage,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
