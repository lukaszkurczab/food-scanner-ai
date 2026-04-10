import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";
import { useAuthContext } from "./AuthContext";

export type AppSettingsContextType = {
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
};

const DEFAULT_LANGUAGE = "en";

function normalizeLanguageCode(language: string | null | undefined): "en" | "pl" {
  const normalized = (language || "").trim().toLowerCase();
  if (normalized === "pl" || normalized.startsWith("pl-")) return "pl";
  return "en";
}

function userLanguageStorageKey(uid: string): string {
  return `user:language:${uid}`;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  language: DEFAULT_LANGUAGE,
  changeLanguage: async () => {},
});

export const AppSettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { uid: authUid } = useAuthContext();
  const uid = authUid || "";
  const [language, setLanguage] = useState<string>(() =>
    normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language)
  );

  useEffect(() => {
    let cancelled = false;

    const loadLanguage = async () => {
      if (!uid) {
        setLanguage(normalizeLanguageCode(i18n.resolvedLanguage ?? i18n.language));
        return;
      }

      const key = userLanguageStorageKey(uid);
      try {
        const storedLanguage = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (storedLanguage) {
          const nextLanguage = normalizeLanguageCode(storedLanguage);
          setLanguage(nextLanguage);
          await i18n.changeLanguage(nextLanguage);
          return;
        }
      } catch {
        // Continue with runtime language fallback.
      }

      const fallbackLanguage = normalizeLanguageCode(
        i18n.resolvedLanguage ?? i18n.language
      );
      if (cancelled) return;
      setLanguage(fallbackLanguage);
      try {
        await AsyncStorage.setItem(key, fallbackLanguage);
      } catch {
        // Ignore per-user language persistence failures.
      }
    };

    void loadLanguage();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const changeLanguage = useCallback(
    async (lang: string) => {
      const nextLanguage = normalizeLanguageCode(lang);
      setLanguage(nextLanguage);
      await i18n.changeLanguage(nextLanguage);
      if (!uid) return;

      try {
        await AsyncStorage.setItem(userLanguageStorageKey(uid), nextLanguage);
      } catch {
        // Ignore per-user language persistence failures.
      }
    },
    [uid]
  );

  const value = useMemo<AppSettingsContextType>(
    () => ({
      language,
      changeLanguage,
    }),
    [language, changeLanguage]
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettingsContext = () => useContext(AppSettingsContext);
