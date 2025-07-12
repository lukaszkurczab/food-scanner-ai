import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance } from "react-native";
import { lightTheme, darkTheme } from "./themes";

const ThemeContext = createContext({
  theme: lightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(
    colorScheme === "dark" ? darkTheme : lightTheme
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev.mode === "light" ? darkTheme : lightTheme));
  };

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === "dark" ? darkTheme : lightTheme);
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
