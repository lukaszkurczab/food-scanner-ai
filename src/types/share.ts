export type ShareFilter = "none" | "bw" | "sepia" | "cool" | "warm";
export type ShareElement = "title" | "kcal" | "pie";
export type ShareFont = "300" | "500" | "700";

export type ChartType = "pie" | "bar" | "line";
export type BarOrientation = "vertical" | "horizontal";
export type MacroLayout = "pie" | "overlay";
export type ThemePreset = "auto" | "light" | "dark";

export type DataSeries = {
  label: string;
  values: number[];
};

export type CustomTextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
};

export type CardVariant =
  | "macroSummaryCard"
  | "macroVerticalStackCard"
  | "macroBadgeCard"
  | "macroSplitCard"
  | "macroTagStripCard";

export type ChartVariant =
  | "macroPieWithLegend"
  | "macroLineMini"
  | "macroBarMini";

export type ShareOptions = {
  showTitle: boolean;
  showKcal: boolean;
  showChart?: boolean;
  showCustom?: boolean;

  filter: ShareFilter;
  bgColor?: string;

  titleSize: number;
  titleColor?: string;
  titleWeight?: "300" | "700" | "500";
  titleFont?: ShareFont;
  titleItalic?: boolean;
  titleUnderline?: boolean;
  titleFontFamily?: string;
  titleFontWeight?: number;

  kcalSize: number;
  kcalColor?: string;
  kcalWeight?: "300" | "500" | "700";
  kcalFont?: ShareFont;
  kcalItalic?: boolean;
  kcalUnderline?: boolean;
  kcalFontFamily?: string;
  kcalFontWeight?: number;

  pieSize: number;

  titleX: number;
  titleY: number;
  kcalX: number;
  kcalY: number;
  pieX: number;
  pieY: number;

  titleRotation: number;
  kcalRotation: number;
  pieRotation: number;

  customText?: string;
  customColor?: string;
  customFont?: ShareFont;
  customItalic?: boolean;
  customUnderline?: boolean;
  customX?: number;
  customY?: number;
  customRotation?: number;
  customSize?: number;
  customFontFamily?: string;
  customFontWeight?: number;
  customTexts?: CustomTextItem[];

  chartType?: ChartType;
  barOrientation?: BarOrientation;
  dataSeries?: DataSeries[];
  macroLayout?: MacroLayout;
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

  cardVariant?: CardVariant;
  chartVariant?: ChartVariant;

  altText?: string;
  themePreset?: ThemePreset;
  lineColor?: string;
  barColor?: string;
};
