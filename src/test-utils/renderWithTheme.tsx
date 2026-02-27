import React from "react";
import { render, type RenderOptions } from "@testing-library/react-native";
import { ThemeProvider } from "@/theme/ThemeProvider";

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider mode="light" followSystem={false}>
    {children}
  </ThemeProvider>
);

export const renderWithTheme = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: ThemeWrapper, ...options });
