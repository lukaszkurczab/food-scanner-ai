export type ShareFilter = "none" | "bw" | "sepia" | "cool" | "warm";
export type ShareElement = "title" | "kcal" | "pie";
export type ShareFont = "regular" | "medium" | "bold" | "light";

export type ChartType = "pie" | "bar" | "line";
export type BarOrientation = "vertical" | "horizontal";
export type MacroLayout = "pie" | "overlay";
export type ThemePreset = "auto" | "light" | "dark";

export type DataSeries = {
  label: string;
  values: number[];
};

export type ShareOptions = {
  showTitle: boolean;
  showKcal: boolean;
  showPie: boolean;
  showChart?: boolean;
  showCustom?: boolean;

  filter: ShareFilter;

  // Title
  titleSize: number;
  titleColor?: string;
  titleWeight?: "regular" | "bold" | "medium";
  titleFont?: ShareFont;
  titleItalic?: boolean;
  titleUnderline?: boolean;

  // Kcal
  kcalSize: number;
  kcalColor?: string;
  kcalWeight?: "regular" | "bold" | "medium";
  kcalFont?: ShareFont;
  kcalItalic?: boolean;
  kcalUnderline?: boolean;

  // Pie
  pieSize: number;

  // Positions (ratios 0..1)
  titleX: number;
  titleY: number;
  kcalX: number;
  kcalY: number;
  pieX: number;
  pieY: number;

  // Rotations (deg)
  titleRotation: number;
  kcalRotation: number;
  pieRotation: number;

  // Custom text sticker
  customText?: string;
  customColor?: string;
  customFont?: ShareFont;
  customItalic?: boolean;
  customUnderline?: boolean;
  customX?: number;
  customY?: number;
  customRotation?: number;
  customSize?: number;

  // NEW: charting + layout + theming
  chartType?: ChartType; // "pie" | "bar" | "line"
  barOrientation?: BarOrientation; // "vertical" | "horizontal"
  dataSeries?: DataSeries[]; // for "line" and "bar"
  macroLayout?: MacroLayout; // "pie" | "overlay"
  showMacroOverlay?: boolean;
  macroColor?: {
    protein?: string;
    carbs?: string;
    fat?: string;
    text?: string;
    background?: string;
  };
  macroX?: number;
  macroY?: number;
  macroSize?: number;
  macroRotation?: number;
  macroVariant?: "chips" | "bars";
  altText?: string; // accessibility alt text
  themePreset?: ThemePreset; // "auto" | "light" | "dark"
  lineColor?: string; // primary line color
  barColor?: string; // primary bar color
};

export const defaultShareOptions: ShareOptions = {
  showTitle: true,
  showKcal: true,
  showPie: true,
  showCustom: false,

  filter: "none",

  // Title
  titleSize: 28,
  titleColor: "#FFFFFF",
  titleWeight: "bold",
  titleFont: "bold",
  titleItalic: false,
  titleUnderline: false,

  // Kcal
  kcalSize: 22,
  kcalColor: "#FFFFFF",
  kcalWeight: "bold",
  kcalFont: "bold",
  kcalItalic: false,
  kcalUnderline: false,

  // Pie
  pieSize: 0.55,

  // Positions
  titleX: 0.5,
  titleY: 0.072,
  kcalX: 0.5,
  kcalY: 0.136,
  pieX: 0.394,
  pieY: 0.809,

  // Rotations
  titleRotation: 0,
  kcalRotation: 0,
  pieRotation: 0,

  // Custom text
  customText: "",
  customColor: "#FFFFFF",
  customFont: "regular",
  customItalic: false,
  customUnderline: false,
  customX: 0.5,
  customY: 0.2,
  customRotation: 0,
  customSize: 18,

  // NEW defaults (spójne z dotychczasowym wyglądem)
  chartType: "pie",
  showChart: true,
  barOrientation: "vertical",
  dataSeries: [],
  macroLayout: "pie",
  showMacroOverlay: true,
  macroColor: {
    protein: "#2196F3", // zbieżne z proteinDark
    carbs: "#81C784", // zbieżne z carbsLight
    fat: "#C6A025", // zbieżne z fatDark
    text: "#FFFFFF",
    background: "rgba(0,0,0,0.35)",
  },
  macroX: 0.5,
  macroY: 0.85,
  macroSize: 1,
  macroRotation: 0,
  macroVariant: "chips",
  altText: "",
  themePreset: "auto",
  lineColor: "#81D4FA", // zbieżne z accentSecondaryLight
  barColor: "#64B5F6", // zbieżne z blue
};
