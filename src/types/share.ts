export type ShareEditorMode =
  | "options"
  | "text"
  | "chart"
  | "card"
  | "background";

export type ShareFilter = "none" | "bw" | "sepia" | "cool" | "warm";
export type ShareElement = "title" | "kcal" | "pie";
export type ShareFont = "300" | "500" | "700";

export type ChartType =
  | "pie"
  | "donut"
  | "bar"
  | "polarArea"
  | "radar"
  | "gauge";

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
  color?: string;
  backgroundColor?: string;
  fontFamilyKey?: string | null;
  fontWeight?: ShareFont;
  italic?: boolean;
  underline?: boolean;
};

export type CardVariant =
  | "macroSummaryCard"
  | "macroVerticalStackCard"
  | "macroBadgeCard"
  | "macroSplitCard"
  | "macroTagStripCard";

export type ChartVariant =
  | "macroPieWithLegend"
  | "macroDonut"
  | "macroBarMini"
  | "macroPolarArea"
  | "macroRadar"
  | "macroGauge";

export type ShareOptions = {
  showTitle: boolean;
  showKcal: boolean;
  showChart?: boolean;
  showCustom?: boolean;

  filter: ShareFilter;
  bgColor?: string;

  titleSize: number;
  titleColor?: string;
  titleBackgroundColor?: string;
  titleWeight?: ShareFont;
  titleFont?: ShareFont;
  titleItalic?: boolean;
  titleUnderline?: boolean;
  titleFontFamily?: string;
  titleFontFamilyKey?: string | null;
  titleFontWeight?: ShareFont;

  kcalSize: number;
  kcalColor?: string;
  kcalBackgroundColor?: string;
  kcalWeight?: ShareFont;
  kcalFont?: ShareFont;
  kcalItalic?: boolean;
  kcalUnderline?: boolean;
  kcalFontFamily?: string;
  kcalFontFamilyKey?: string | null;
  kcalFontWeight?: ShareFont;

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
  customBackgroundColor?: string;
  customFont?: ShareFont;
  customItalic?: boolean;
  customUnderline?: boolean;
  customX?: number;
  customY?: number;
  customRotation?: number;
  customSize?: number;
  customFontFamily?: string;
  customFontFamilyKey?: string | null;
  customFontWeight?: ShareFont;
  customTexts?: CustomTextItem[];

  chartType?: ChartType;
  barOrientation?: BarOrientation;
  dataSeries?: DataSeries[];

  showChartKcalLabel?: boolean;
  showChartLegend?: boolean;

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

  cardShowKcal?: boolean;
  cardShowMacros?: boolean;

  altText?: string;
  themePreset?: ThemePreset;

  lineColor?: string;
  barColor?: string;

  chartTextColor?: string;
  chartFontFamilyKey?: string | null;
  chartFontWeight?: ShareFont;
  chartMacroColors?: {
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  chartBackgroundColor?: string;
  chartInnerRadiusRatio?: number;
  chartProteinColor?: string;
  chartCarbsColor?: string;
  chartFatColor?: string;

  photoX?: number;
  photoY?: number;
  photoScale?: number;
  photoRotation?: number;

  textFontFamilyKey?: string | null;
  textFontWeight?: ShareFont | null;

  titleText?: string;
  kcalText?: string;

  cardTextColor?: string;
  cardFontFamilyKey?: string | null;
  cardFontWeight?: ShareFont;
  cardMacroProteinColor?: string;
  cardMacroCarbsColor?: string;
  cardMacroFatColor?: string;
  cardBackgroundColor?: string;
};
