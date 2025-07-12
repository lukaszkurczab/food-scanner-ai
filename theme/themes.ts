import { baseColors } from "./colors";

export const lightTheme = {
  mode: "light",
  background: baseColors.white,
  card: baseColors.grayLight,
  text: baseColors.textLight,
  textSecondary: baseColors.textSecondaryLight,
  accent: baseColors.green,
  accentSecondary: baseColors.lightBlue,
  border: baseColors.borderLight,
  macro: {
    protein: baseColors.blue,
    fat: baseColors.yellow,
    carbs: baseColors.carbsLight,
  },
};

export const darkTheme = {
  mode: "dark",
  background: baseColors.black,
  card: baseColors.grayDark,
  text: baseColors.textDark,
  textSecondary: baseColors.textSecondaryDark,
  accent: baseColors.green,
  accentSecondary: "#03A9F4",
  border: baseColors.borderDark,
  macro: {
    protein: "#2196F3",
    fat: baseColors.yellow,
    carbs: baseColors.carbsDark,
  },
};
