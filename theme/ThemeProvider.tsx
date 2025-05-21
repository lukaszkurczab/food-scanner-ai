import { createContext, useContext, useState, ReactNode } from "react";
import { Appearance } from "react-native";
import { lightTheme, darkTheme, AppTheme } from "./colors";

type ThemeContextType = {
  theme: AppTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState<AppTheme>(lightTheme);

  const toggleTheme = () => {
    setTheme((prev) => (prev.mode === "dark" ? lightTheme : darkTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useThemeContext must be used within ThemeProvider");
  return context;
};
