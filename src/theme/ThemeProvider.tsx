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

const ThemeContext = createContext({
  theme: { ...lightTheme, spacing, rounded, typography },
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const colorScheme = Appearance.getColorScheme();

  const makeTheme = (mode: "light" | "dark") => ({
    ...(mode === "dark" ? darkTheme : lightTheme),
    spacing,
    rounded,
    typography,
  });

  const [theme, setTheme] = useState(
    makeTheme(colorScheme === "dark" ? "dark" : "light")
  );

  const toggleTheme = () => {
    setTheme((prev) => makeTheme(prev.mode === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(makeTheme(colorScheme === "dark" ? "dark" : "light"));
    });
    return () => subscription.remove();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
