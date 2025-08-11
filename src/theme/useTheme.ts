import { useThemeContext } from "./ThemeProvider";

export const useTheme = () => {
  const { theme, setMode } = useThemeContext();
  return { ...theme, setMode };
};
