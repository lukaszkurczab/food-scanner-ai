import React from "react";
import { ThemeProvider } from "./ThemeProvider";

// PRZYKŁAD: zamiast tego podepnij swój kontekst/selector
import { useUserContext } from "@contexts/UserContext";

export const ThemeController: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userData } = useUserContext();
  const mode =
    userData?.darkTheme === true
      ? "dark"
      : userData?.darkTheme === false
      ? "light"
      : undefined;

  // Jeśli użytkownik nie ma preferencji → śledź system
  return (
    <ThemeProvider mode={mode as any} followSystem={mode === undefined}>
      {children}
    </ThemeProvider>
  );
};
