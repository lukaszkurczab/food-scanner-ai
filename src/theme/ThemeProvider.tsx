import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import { lightTheme, darkTheme } from "./themes";
import { spacing } from "./spacing";
import { rounded } from "./rounded";
import { typography } from "./typography";

type ThemeMode = "light" | "dark";
type ThemeType = typeof lightTheme & {
  spacing: typeof spacing;
  rounded: typeof rounded;
  typography: typeof typography;
};

type Props = {
  children: React.ReactNode;
  mode?: ThemeMode;
  followSystem?: boolean;
  onModeChange?: (mode: ThemeMode) => void;
};

type ThemeContextType = {
  theme: ThemeType;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: { ...lightTheme, spacing, rounded, typography },
  mode: "light",
  setMode: () => {},
});

export const ThemeProvider: React.FC<Props> = ({
  children,
  mode,
  followSystem = true,
  onModeChange,
}) => {
  const [internalMode, setInternalMode] = useState<ThemeMode>(() => {
    if (mode) return mode;
    const sys = Appearance.getColorScheme();
    return sys === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    if (mode) setInternalMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!followSystem || mode) return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const m = colorScheme === "dark" ? "dark" : "light";
      setInternalMode(m);
      onModeChange?.(m);
    });
    return () => sub.remove();
  }, [followSystem, mode, onModeChange]);

  const theme = useMemo<ThemeType>(() => {
    const base = internalMode === "dark" ? darkTheme : lightTheme;
    return { ...base, spacing, rounded, typography };
  }, [internalMode]);

  const setMode = (m: ThemeMode) => {
    setInternalMode(m);
    onModeChange?.(m);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode: internalMode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
