import { baseColors } from "./colors";

export type ThemeMode = "light" | "dark";

export type ThemeDefinition = {
  mode: ThemeMode;
  isDark: boolean;

  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primarySoft: string;
  primaryStrong: string;
  accentWarm: string;
  accentWarmStrong: string;
  aiAccent: string;

  border: string;
  borderSoft: string;
  divider: string;
  focusRing: string;

  link: string;
  overlay: string;
  shadow: string;

  disabled: {
    background: string;
    text: string;
    border: string;
  };

  error: {
    strong: string;
    main: string;
    border: string;
    surface: string;
    text: string;
    onColor: string;
  };

  success: {
    main: string;
    surface: string;
    text: string;
    onColor: string;
  };

  warning: {
    main: string;
    surface: string;
    text: string;
    onColor: string;
  };

  info: {
    main: string;
    surface: string;
    text: string;
    onColor: string;
  };

  chart: {
    protein: string;
    proteinSoft: string;
    carbs: string;
    carbsSoft: string;
    fat: string;
    fatSoft: string;
    calories: string;
    caloriesSoft: string;
  };

  macro: {
    protein: string;
    proteinSoft: string;
    carbs: string;
    carbsSoft: string;
    fat: string;
    fatSoft: string;
    calories: string;
    caloriesSoft: string;
  };

  cta: {
    primaryBackground: string;
    primaryText: string;
    secondaryBackground: string;
    secondaryText: string;
    secondaryBorder: string;
    ghostText: string;
    destructiveBackground: string;
    destructiveText: string;
  };

  input: {
    background: string;
    backgroundDisabled: string;
    text: string;
    placeholder: string;
    border: string;
    borderFocused: string;
    borderError: string;
  };

  status: {
    positive: string;
    caution: string;
    negative: string;
    neutral: string;
  };
};

const lightTheme: ThemeDefinition = {
  mode: "light",
  isDark: false,

  background: baseColors.cream50,
  backgroundSecondary: baseColors.sand100,
  surface: baseColors.cream0,
  surfaceAlt: baseColors.sand100,
  surfaceElevated: baseColors.white,

  text: baseColors.ink900,
  textSecondary: baseColors.ink700,
  textTertiary: baseColors.ink500,
  textInverse: baseColors.cream0,

  primary: baseColors.olive500,
  primarySoft: baseColors.olive400,
  primaryStrong: baseColors.olive700,
  accentWarm: baseColors.terracotta500,
  accentWarmStrong: baseColors.terracotta700,
  aiAccent: baseColors.terracotta500,

  border: baseColors.sand300,
  borderSoft: baseColors.sand200,
  divider: baseColors.sand300,
  focusRing: baseColors.focusRingLight,

  link: baseColors.olive500,
  overlay: baseColors.overlayLight,
  shadow: baseColors.shadowLight,

  disabled: {
    background: baseColors.sand100,
    text: baseColors.ink500,
    border: baseColors.sand300,
  },

  error: {
    strong: baseColors.errorStrong,
    main: baseColors.error,
    border: baseColors.errorBorder,
    surface: baseColors.errorSurface,
    text: baseColors.errorStrong,
    onColor: baseColors.onError,
  },

  success: {
    main: baseColors.success,
    surface: baseColors.successSoft,
    text: baseColors.successText,
    onColor: baseColors.cream0,
  },

  warning: {
    main: baseColors.warning,
    surface: baseColors.warningSoft,
    text: baseColors.warningText,
    onColor: baseColors.cream0,
  },

  info: {
    main: baseColors.info,
    surface: baseColors.infoSoft,
    text: baseColors.infoText,
    onColor: baseColors.cream0,
  },

  chart: {
    protein: baseColors.macroProtein,
    proteinSoft: baseColors.macroProteinSoft,
    carbs: baseColors.macroCarbs,
    carbsSoft: baseColors.macroCarbsSoft,
    fat: baseColors.macroFat,
    fatSoft: baseColors.macroFatSoft,
    calories: baseColors.calories,
    caloriesSoft: baseColors.caloriesSoft,
  },

  macro: {
    protein: baseColors.macroProtein,
    proteinSoft: baseColors.macroProteinSoft,
    carbs: baseColors.macroCarbs,
    carbsSoft: baseColors.macroCarbsSoft,
    fat: baseColors.macroFat,
    fatSoft: baseColors.macroFatSoft,
    calories: baseColors.calories,
    caloriesSoft: baseColors.caloriesSoft,
  },

  cta: {
    primaryBackground: baseColors.olive500,
    primaryText: baseColors.cream0,
    secondaryBackground: baseColors.cream0,
    secondaryText: baseColors.olive500,
    secondaryBorder: baseColors.sand300,
    ghostText: baseColors.olive500,
    destructiveBackground: baseColors.errorStrong,
    destructiveText: baseColors.onError,
  },

  input: {
    background: baseColors.cream0,
    backgroundDisabled: baseColors.sand100,
    text: baseColors.ink900,
    placeholder: baseColors.ink500,
    border: baseColors.sand300,
    borderFocused: baseColors.olive400,
    borderError: baseColors.error,
  },

  status: {
    positive: baseColors.success,
    caution: baseColors.warning,
    negative: baseColors.error,
    neutral: baseColors.ink500,
  },
};

const darkTheme: ThemeDefinition = {
  mode: "dark",
  isDark: true,

  background: baseColors.darkBackground,
  backgroundSecondary: baseColors.darkSurface,
  surface: baseColors.darkSurface,
  surfaceAlt: baseColors.darkSurfaceAlt,
  surfaceElevated: "#242924",

  text: baseColors.darkText,
  textSecondary: baseColors.darkTextSecondary,
  textTertiary: baseColors.darkTextTertiary,
  textInverse: baseColors.ink900,

  primary: baseColors.olive400,
  primarySoft: "#89A284",
  primaryStrong: "#A6BDA0",
  accentWarm: baseColors.terracotta500,
  accentWarmStrong: "#D59A81",
  aiAccent: baseColors.terracotta500,

  border: baseColors.darkBorder,
  borderSoft: baseColors.darkBorderSoft,
  divider: baseColors.darkBorder,
  focusRing: baseColors.focusRingDark,

  link: "#9BB896",
  overlay: baseColors.overlayDark,
  shadow: baseColors.shadowDark,

  disabled: {
    background: "#222722",
    text: baseColors.darkTextTertiary,
    border: baseColors.darkBorderSoft,
  },

  error: {
    strong: "#D16A58",
    main: "#C85D4C",
    border: "#8A4A40",
    surface: "#2D201D",
    text: "#F2C4BB",
    onColor: baseColors.onError,
  },

  success: {
    main: "#7FA07A",
    surface: "#223025",
    text: "#C8D8C5",
    onColor: baseColors.ink900,
  },

  warning: {
    main: "#D1A15B",
    surface: "#332A1D",
    text: "#F0D9B4",
    onColor: baseColors.ink900,
  },

  info: {
    main: "#8CA9BF",
    surface: "#1F2A31",
    text: "#D0DEE8",
    onColor: baseColors.ink900,
  },

  chart: {
    protein: baseColors.macroProtein,
    proteinSoft: "rgba(74, 144, 226, 0.20)",
    carbs: baseColors.macroCarbs,
    carbsSoft: "rgba(102, 169, 107, 0.20)",
    fat: baseColors.macroFat,
    fatSoft: "rgba(201, 162, 39, 0.20)",
    calories: baseColors.calories,
    caloriesSoft: "rgba(94, 115, 80, 0.24)",
  },

  macro: {
    protein: baseColors.macroProtein,
    proteinSoft: "rgba(74, 144, 226, 0.20)",
    carbs: baseColors.macroCarbs,
    carbsSoft: "rgba(102, 169, 107, 0.20)",
    fat: baseColors.macroFat,
    fatSoft: "rgba(201, 162, 39, 0.20)",
    calories: baseColors.calories,
    caloriesSoft: "rgba(94, 115, 80, 0.24)",
  },

  cta: {
    primaryBackground: baseColors.olive400,
    primaryText: baseColors.ink900,
    secondaryBackground: baseColors.darkSurface,
    secondaryText: baseColors.darkText,
    secondaryBorder: baseColors.darkBorder,
    ghostText: baseColors.olive400,
    destructiveBackground: "#C85D4C",
    destructiveText: baseColors.onError,
  },

  input: {
    background: "#202520",
    backgroundDisabled: "#1B1F1B",
    text: baseColors.darkText,
    placeholder: baseColors.darkTextTertiary,
    border: baseColors.darkBorder,
    borderFocused: baseColors.olive400,
    borderError: "#C85D4C",
  },

  status: {
    positive: "#7FA07A",
    caution: "#D1A15B",
    negative: "#C85D4C",
    neutral: baseColors.darkTextTertiary,
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export type ThemeName = keyof typeof themes;
