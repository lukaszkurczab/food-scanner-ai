import React from "react";
import { ThemeProvider } from "./ThemeProvider";

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

  return (
    <ThemeProvider mode={mode} followSystem={mode === undefined}>
      {children}
    </ThemeProvider>
  );
};
