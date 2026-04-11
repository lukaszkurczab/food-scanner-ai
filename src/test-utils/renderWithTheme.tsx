import React from "react";
import { render, type RenderOptions } from "@testing-library/react-native";
import { ThemeProvider } from "@/theme/ThemeProvider";
import * as SafeAreaContext from "react-native-safe-area-context";

const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

const MaybeSafeAreaInsetsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const InsetsContext = SafeAreaContext.SafeAreaInsetsContext as
    | React.Context<{
        top: number;
        right: number;
        bottom: number;
        left: number;
      } | null>
    | undefined;

  if (!InsetsContext) {
    return <>{children}</>;
  }

  return (
    <InsetsContext.Provider value={TEST_SAFE_AREA_METRICS.insets}>
      {children}
    </InsetsContext.Provider>
  );
};

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MaybeSafeAreaInsetsProvider>
    <ThemeProvider mode="light" followSystem={false}>
      {children}
    </ThemeProvider>
  </MaybeSafeAreaInsetsProvider>
);

export const renderWithTheme = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: ThemeWrapper, ...options });
