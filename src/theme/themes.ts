import { baseColors } from "./colors";

export type ThemeMode = "light" | "dark";

export type ThemeDefinition = {
  mode: ThemeMode;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
  border: string;
  disabled: {
    background: string;
    text: string;
    border: string;
  };
  macro: {
    protein: string;
    fat: string;
    carbs: string;
  };
  error: {
    background: string;
    border: string;
    text: string;
  };
  success: {
    background: string;
    text: string;
  };
  warning: {
    background: string;
    text: string;
  };
  link: string;
  onAccent: string;
  overlay: string;
  shadow: string;
};

const sharedTokens = {
  accent: baseColors.green,
};

const modeTokens: Record<
  ThemeMode,
  Omit<ThemeDefinition, "mode" | "accent">
> = {
  light: {
    background: baseColors.white,
    card: baseColors.grayLight,
    text: baseColors.textLight,
    textSecondary: baseColors.textSecondaryLight,
    accentSecondary: baseColors.accentSecondaryLight,
    border: baseColors.borderLight,
    disabled: {
      background: baseColors.disabledBackgroundLight,
      text: baseColors.disabledTextLight,
      border: baseColors.disabledBorderLight,
    },
    macro: {
      protein: baseColors.blue,
      fat: baseColors.yellow,
      carbs: baseColors.green,
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
  },
  dark: {
    background: baseColors.black,
    card: baseColors.grayDark,
    text: baseColors.textDark,
    textSecondary: baseColors.textSecondaryDark,
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
  },
};

export const createTheme = (
  mode: ThemeMode,
  overrides: Partial<ThemeDefinition> = {}
): ThemeDefinition => {
  const base = modeTokens[mode];
  const theme: ThemeDefinition = {
    mode,
    accent: sharedTokens.accent,
    ...base,
    disabled: { ...base.disabled },
    macro: { ...base.macro },
    error: { ...base.error },
    success: { ...base.success },
    warning: { ...base.warning },
  };

  return {
    ...theme,
    ...overrides,
  };
};

export const lightTheme = createTheme("light");
export const darkTheme = createTheme("dark");

export const purpleTheme = createTheme("light", {
  accent: baseColors.purple,
  accentSecondary: baseColors.purpleSecondary,
});

export const orangeTheme = createTheme("light", {
  accent: baseColors.orange,
  accentSecondary: baseColors.orangeSecondary,
});

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  purple: purpleTheme,
  orange: orangeTheme,
};

export type ThemeName = keyof typeof themes;
