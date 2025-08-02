import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useAuthContext } from "./AuthContext";
import { useUser } from "@/src/hooks/useUser";
import { useSettings } from "@/src/hooks/useSettings";
import { useMeals } from "@/src/hooks/useMeals";
import { useChatHistory } from "@/src/hooks/useChatHistory";
import type { UserData, ChatMessage, Meal } from "@/src/types";
import { fullSync } from "@/src/utils/fullSync";

type UserContextType = {
  userData: UserData | null;
  loadingUser: boolean;
  syncState: "synced" | "pending" | "conflict";
  refreshUser: () => Promise<void>;
  getUserData: () => Promise<void>;
  updateUser: (data: Partial<UserData>) => Promise<void>;
  syncUserProfile: () => Promise<void>;
  deleteUser: (password?: string) => Promise<void>;
  setAvatar: (photoUri: string) => Promise<void>;
  changeUsername: (newUsername: string, password: string) => Promise<void>;

  settings: Record<string, string>;
  loadingSettings: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  refreshSettings: () => Promise<void>;

  meals: Meal[];
  loadingMeals: boolean;
  getMeals: (date?: string) => Promise<void>;
  addMeal: (
    meal: Omit<Meal, "id" | "syncState" | "lastUpdated" | "source">
  ) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  syncMeals: () => Promise<void>;
  getUnsyncedMeals: () => Promise<Meal[]>;

  chatMessages: ChatMessage[];
  loadingChat: boolean;
  addChatMessage: (
    msg: Omit<ChatMessage, "id" | "syncState" | "deleted">
  ) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  syncChatHistory: () => Promise<void>;
  getChatHistory: () => Promise<void>;
  chatsyncState: "synced" | "pending" | "conflict";
};

const UserContext = createContext<UserContextType>({
  userData: null,
  loadingUser: true,
  syncState: "pending",
  getUserData: async () => {},
  refreshUser: async () => {},
  updateUser: async () => {},
  syncUserProfile: async () => {},
  deleteUser: async () => {},
  setAvatar: async () => {},
  changeUsername: async () => {},

  settings: {},
  loadingSettings: true,
  updateSetting: async () => {},
  refreshSettings: async () => {},

  meals: [],
  loadingMeals: true,
  getMeals: async () => {},
  addMeal: async () => {},
  updateMeal: async () => {},
  deleteMeal: async () => {},
  syncMeals: async () => {},
  getUnsyncedMeals: async () => [],

  chatMessages: [],
  loadingChat: true,
  addChatMessage: async () => {},
  deleteChatMessage: async () => {},
  syncChatHistory: async () => {},
  getChatHistory: async () => {},
  chatsyncState: "pending",
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: authUser } = useAuthContext();
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
  } = useUser(uid);

  const {
    settings,
    loading: loadingSettings,
    updateSetting,
    syncSettings,
  } = useSettings(uid);

  const {
    meals,
    loading: loadingMeals,
    getMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    syncMeals,
    getUnsyncedMeals,
  } = useMeals(uid);

  const {
    messages: chatMessages,
    loading: loadingChat,
    syncState: chatsyncState,
    getChatHistory,
    addChatMessage,
    deleteChatMessage,
    syncChatHistory,
  } = useChatHistory(uid);

  const refreshUser = useCallback(async () => {
    await getUserProfile();
  }, [getUserProfile]);
  const refreshSettings = useCallback(async () => {
    await syncSettings();
  }, [syncSettings]);

  useEffect(() => {
    if (uid) {
      fullSync({
        syncUserProfile,
        syncSettings,
        getMeals,
        getChatHistory,
      });
    }
  }, [
    uid,
    getUserProfile,
    syncUserProfile,
    syncSettings,
    getMeals,
    getChatHistory,
  ]);

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

        settings,
        loadingSettings,
        updateSetting,
        refreshSettings,

        meals,
        loadingMeals,
        getMeals,
        addMeal,
        updateMeal,
        deleteMeal,
        syncMeals,
        getUnsyncedMeals,

        chatMessages,
        loadingChat,
        addChatMessage,
        deleteChatMessage,
        syncChatHistory,
        getChatHistory,
        chatsyncState,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
