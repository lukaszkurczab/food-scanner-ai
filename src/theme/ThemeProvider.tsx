import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Appearance } from "react-native";
import { lightTheme, darkTheme } from "./themes";
import { spacing } from "./spacing";
import { rounded } from "./rounded";
import { typography } from "./typography";
import { useUserContext } from "@/src/context/UserContext";

type ThemeMode = "light" | "dark";
type ThemeType = typeof lightTheme & {
  spacing: typeof spacing;
  rounded: typeof rounded;
  typography: typeof typography;
};

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: (newTheme: ThemeMode) => void;
  mode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: { ...lightTheme, spacing, rounded, typography },
  toggleTheme: () => {},
  mode: "light",
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { userData } = useUserContext();
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    if (typeof userData?.darkTheme === "boolean") {
      setMode(userData.darkTheme ? "dark" : "light");
    } else {
      const sys = Appearance.getColorScheme();
      setMode(sys === "dark" ? "dark" : "light");
    }

    let subscription: any;
    if (userData?.darkTheme === undefined) {
      subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setMode(colorScheme === "dark" ? "dark" : "light");
      });
    }
    return () => {
      if (subscription) subscription.remove();
    };
  }, [userData?.darkTheme]);

  const makeTheme = (mode: ThemeMode): ThemeType => ({
    ...(mode === "dark" ? darkTheme : lightTheme),
    spacing,
    rounded,
    typography,
  });

  const toggleTheme = (newTheme: ThemeMode) => {
    setMode(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme: makeTheme(mode), toggleTheme, mode }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
