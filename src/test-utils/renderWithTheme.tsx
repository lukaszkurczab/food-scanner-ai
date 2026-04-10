import React from "react";
import { render, type RenderOptions } from "@testing-library/react-native";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
    <ThemeProvider mode="light" followSystem={false}>
      {children}
    </ThemeProvider>
  </SafeAreaProvider>
);

export const renderWithTheme = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: ThemeWrapper, ...options });
