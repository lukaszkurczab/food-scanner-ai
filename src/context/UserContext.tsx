import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useAuthContext } from "./AuthContext";
import { useUser } from "@/src/hooks/useUser";
import { useSurvey } from "@/src/hooks/useSurvey";
import { useSettings } from "@/src/hooks/useSettings";
import { useMeals } from "@/src/hooks/useMeals";
import { useChatHistory } from "@/src/hooks/useChatHistory";
import type { UserData, FormData, ChatMessage, Meal } from "@/src/types";

type UserContextType = {
  user: UserData | null;
  loadingUser: boolean;
  syncStatus: "synced" | "pending" | "conflict";
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<UserData>) => Promise<void>;

  survey: any | null;
  loadingSurvey: boolean;
  saveSurvey: (data: FormData) => Promise<void>;
  refreshSurvey: () => Promise<void>;

  settings: Record<string, string>;
  loadingSettings: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  refreshSettings: () => Promise<void>;

  meals: Meal[];
  loadingMeals: boolean;
  getMeals: (date?: string) => Promise<void>;
  addMeal: (
    meal: Omit<Meal, "id" | "syncStatus" | "lastUpdated" | "source">
  ) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  syncMeals: () => Promise<void>;
  getUnsyncedMeals: () => Promise<Meal[]>;

  chatMessages: ChatMessage[];
  loadingChat: boolean;
  addChatMessage: (
    msg: Omit<ChatMessage, "id" | "syncStatus" | "deleted">
  ) => Promise<void>;
  deleteChatMessage: (id: string) => Promise<void>;
  syncChatHistory: () => Promise<void>;
  getChatHistory: () => Promise<void>;
  chatSyncStatus: "synced" | "pending" | "conflict";
};

const UserContext = createContext<UserContextType>({
  user: null,
  loadingUser: true,
  syncStatus: "pending",
  refreshUser: async () => {},
  updateUser: async () => {},

  survey: null,
  loadingSurvey: true,
  saveSurvey: async () => {},
  refreshSurvey: async () => {},

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
  chatSyncStatus: "pending",
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: authUser } = useAuthContext();
  const uid = authUser?.uid || "";

  const {
    user,
    loading: loadingUser,
    syncStatus,
    getUserProfile,
    updateUserProfile,
  } = useUser(uid);

  const {
    survey,
    loading: loadingSurvey,
    saveSurvey,
    getSurvey,
  } = useSurvey(uid);

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
    syncStatus: chatSyncStatus,
    getChatHistory,
    addChatMessage,
    deleteChatMessage,
    syncChatHistory,
  } = useChatHistory(uid);

  const refreshUser = useCallback(async () => {
    await getUserProfile();
  }, [getUserProfile]);
  const refreshSurvey = useCallback(async () => {
    await getSurvey();
  }, [getSurvey]);
  const refreshSettings = useCallback(async () => {
    await syncSettings();
  }, [syncSettings]);

  useEffect(() => {
    if (!uid) return;
    getUserProfile();
    getSurvey();
    syncSettings();
    getMeals();
    getChatHistory();
  }, [uid]);

  return (
    <UserContext.Provider
      value={{
        user,
        loadingUser,
        syncStatus,
        refreshUser,
        updateUser: updateUserProfile,

        survey,
        loadingSurvey,
        saveSurvey,
        refreshSurvey,

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
        chatSyncStatus,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
