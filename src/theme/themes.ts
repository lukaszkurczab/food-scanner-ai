import { baseColors } from "./colors";

export const lightTheme = {
  mode: "light",
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
};

export const darkTheme = {
  mode: "dark",
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
};
