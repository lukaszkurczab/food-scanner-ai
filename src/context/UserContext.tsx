import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useAuthContext } from "./AuthContext";
import { useUser } from "@hooks/useUser";
import type { UserData } from "@/types";
import i18n from "@/i18n";

// ⬇️ OFFLINE bootstrap
import { runMigrations } from "@/services/offline/db";
import { migrateInitialMeals } from "@/services/offline/migrate";
import { startSyncLoop } from "@/services/offline/sync.engine";

export type UserContextType = {
  userData: UserData | null;
  loadingUser: boolean;
  syncState: "synced" | "pending" | "conflict";
  refreshUser: () => Promise<void>;
  getUserData: () => Promise<UserData | null>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
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
  getUserData: async () => null,
  refreshUser: async () => {},
  updateUser: async () => {},
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
    getUserProfile,
    updateUserProfile,
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
    await getUserProfile();
  }, [getUserProfile]);

  // ⬇️ uruchom migracje bazy lokalnej raz przy starcie aplikacji
  useEffect(() => {
    try {
      runMigrations();
    } catch {}
  }, []);

  // ⬇️ po zalogowaniu: jednorazowa migracja początkowa + start pętli synchronizacji
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        await migrateInitialMeals(uid);
      } catch {}
      startSyncLoop(uid); // idempotentne – czyści poprzedni timer/listener
    })();
  }, [uid]);

  useEffect(() => {
    syncUserProfile();
  }, [uid, syncUserProfile]);

  // Ensure user's saved language preference overrides device settings
  useEffect(() => {
    const userLang = userData?.language;
    if (!userLang) return;
    if (i18n.language !== userLang) {
      i18n.changeLanguage(userLang).catch(() => {});
    }
  }, [userData?.language]);

  return (
    <UserContext.Provider
      value={{
        userData,
        loadingUser,
        syncState,
        refreshUser,
        getUserData: getUserProfile,
        updateUser: updateUserProfile,
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
