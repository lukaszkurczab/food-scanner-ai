import { ShareOptions } from "@/types/share";

export const defaultShareOptions: ShareOptions = {
  showTitle: false,
  showKcal: false,
  showCustom: false,
  showChart: false,
  showMacroOverlay: false,

  filter: "none",
  bgColor: "#000000",

  titleSize: 1,
  titleColor: "#FFFFFF",
  titleWeight: "500",
  titleFont: "500",
  titleItalic: false,
  titleUnderline: false,

  kcalSize: 1,
  kcalColor: "#FFFFFF",
  kcalWeight: "500",
  kcalFont: "500",
  kcalItalic: false,
  kcalUnderline: false,

  pieSize: 0.55,

  titleX: 0.5,
  titleY: 0.072,
  kcalX: 0.5,
  kcalY: 0.136,
  pieX: 0.394,
  pieY: 0.809,

  titleRotation: 0,
  kcalRotation: 0,
  pieRotation: 0,

  customText: "",
  customColor: "#FFFFFF",
  customFont: "500",
  customItalic: false,
  customUnderline: false,
  customX: 0.5,
  customY: 0.2,
  customRotation: 0,
  customSize: 1,
  customTexts: [],

  chartType: "pie",
  barOrientation: "vertical",
  dataSeries: [],
  macroLayout: "pie",
  macroColor: {
    protein: "#2196F3",
    carbs: "#81C784",
    fat: "#C6A025",
    text: "#FFFFFF",
    background: "rgba(0,0,0,0.35)",
  },
  macroX: 0.5,
  macroY: 0.85,
  macroSize: 1,
  macroRotation: 0,

  cardVariant: "macroSummaryCard",
  chartVariant: "macroPieWithLegend",

  altText: "",
  themePreset: "auto",
  lineColor: "#81D4FA",
  barColor: "#64B5F6",
};
