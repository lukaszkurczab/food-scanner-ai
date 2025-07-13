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
  macro: {
    protein: baseColors.blue,
    fat: baseColors.yellow,
    carbs: baseColors.carbsLight,
  },
  error: {
    background: baseColors.errorBackgroundLight,
    border: baseColors.errorBorderLight,
    text: baseColors.errorTextLight,
  },
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
  macro: {
    protein: baseColors.proteinDark,
    fat: baseColors.yellow,
    carbs: baseColors.carbsDark,
  },
  error: {
    background: baseColors.errorBackgroundDark,
    border: baseColors.errorBorderDark,
    text: baseColors.errorTextDark,
  },
};
