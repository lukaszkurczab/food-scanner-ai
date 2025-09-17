// src/theme/themes.ts
import { baseColors } from "./colors";

const commonTypo = {
  fontFamily: {
    regular: "Inter-Regular",
    medium: "Inter-Medium",
    bold: "Inter-Bold",
    light: "Inter-Light",
    semiBold: "Inter-SemiBold", // NEW
    extraBold: "Inter-ExtraBold", // NEW
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
    xxl: 32,
    title: 36,
  },
  weight: {
    regular: "400",
    medium: "500",
    bold: "bold",
    semiBold: "600",
    extraBold: "800" as const,
  },
  lineHeight: { base: 24, heading: 32, tight: 20 },
  rounded: { full: 999 },
};

export const lightTheme = {
  mode: "light" as const,
  background: baseColors.white,
  card: baseColors.grayLight,
  text: baseColors.textLight,
  textSecondary: baseColors.textSecondaryLight,
  accent: baseColors.green,
  accentSecondary: baseColors.accentSecondaryLight,
  border: baseColors.borderLight,
  disabled: {
    background: baseColors.disabledBackgroundLight,
    text: baseColors.disabledTextLight,
    border: baseColors.disabledBorderLight,
  },
  macro: {
    protein: baseColors.blue,
    fat: baseColors.fatDark,
    carbs: baseColors.carbsLight,
  },
  error: {
    background: baseColors.errorBackgroundLight,
    border: baseColors.errorBorderLight,
    text: baseColors.errorTextLight,
  },
  success: {
    background: baseColors.successBackgroundLight,
    text: baseColors.successTextLight,
  },
  warning: {
    background: baseColors.warningBackgroundLight,
    text: baseColors.warningTextLight,
  },
  link: baseColors.linkLight,
  onAccent: baseColors.onAccentLight,
  overlay: baseColors.overlayLight,
  shadow: baseColors.shadowLight,
  typography: commonTypo,
};

export const darkTheme = {
  mode: "dark" as const,
  background: baseColors.black,
  card: baseColors.grayDark,
  text: baseColors.textDark,
  textSecondary: baseColors.textSecondaryDark,
  accent: baseColors.green,
  accentSecondary: baseColors.accentSecondaryDark,
  border: baseColors.borderDark,
  disabled: {
    background: baseColors.disabledBackgroundDark,
    text: baseColors.disabledTextDark,
    border: baseColors.disabledBorderDark,
  },
  macro: {
    protein: baseColors.proteinDark,
    fat: baseColors.fatDark,
    carbs: baseColors.carbsDark,
  },
  error: {
    background: baseColors.errorBackgroundDark,
    border: baseColors.errorBorderDark,
    text: baseColors.errorTextDark,
  },
  success: {
    background: baseColors.successBackgroundDark,
    text: baseColors.successTextDark,
  },
  warning: {
    background: baseColors.warningBackgroundDark,
    text: baseColors.warningTextDark,
  },
  link: baseColors.linkDark,
  onAccent: baseColors.onAccentDark,
  overlay: baseColors.overlayDark,
  shadow: baseColors.shadowDark,
  typography: commonTypo,
};

// NEW: additional light variants
export const purpleTheme = {
  ...lightTheme,
  accent: baseColors.purple,
  accentSecondary: baseColors.purpleSecondary,
};

export const orangeTheme = {
  ...lightTheme,
  accent: baseColors.orange,
  accentSecondary: baseColors.orangeSecondary,
};

// opcjonalnie eksport aliasów zbiorczych
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  purple: purpleTheme,
  orange: orangeTheme,
};
