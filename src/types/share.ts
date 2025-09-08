export type ShareFilter = "none" | "bw" | "sepia" | "cool" | "warm";
export type ShareElement = "title" | "kcal" | "pie";

export type ShareFont = "regular" | "medium" | "bold" | "light";

export type ShareOptions = {
  showTitle: boolean;
  showKcal: boolean;
  showPie: boolean;
  showCustom?: boolean;
  filter: ShareFilter;
  titleSize: number; // kept for backward-compat; scale handles size
  titleColor?: string;
  titleWeight?: "regular" | "bold" | "medium"; // deprecated, use titleFont
  titleFont?: ShareFont;
  titleItalic?: boolean;
  titleUnderline?: boolean;
  kcalSize: number; // kept for backward-compat; scale handles size
  kcalColor?: string;
  kcalWeight?: "regular" | "bold" | "medium"; // deprecated, use kcalFont
  kcalFont?: ShareFont;
  kcalItalic?: boolean;
  kcalUnderline?: boolean;
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

  // Custom text element
  customText?: string;
  customColor?: string;
  customFont?: ShareFont;
  customItalic?: boolean;
  customUnderline?: boolean;
  customX?: number;
  customY?: number;
  customRotation?: number;
  customSize?: number; // legacy; use scale
};

export const defaultShareOptions: ShareOptions = {
  showTitle: true,
  showKcal: true,
  showPie: true,
  showCustom: false,
  filter: "none",
  titleSize: 28,
  titleColor: "#FFFFFF",
  titleWeight: "bold",
  titleFont: "bold",
  titleItalic: false,
  titleUnderline: false,
  kcalSize: 22,
  kcalColor: "#FFFFFF",
  kcalWeight: "bold",
  kcalFont: "bold",
  kcalItalic: false,
  kcalUnderline: false,
  pieSize: 0.55,
  // Defaults tuned for a 360x640 canvas:
  // Title centered, 32px from top (approx)
  titleX: 0.5,
  titleY: 0.072,
  // Calories centered, ~16px below title (approx)
  kcalX: 0.5,
  kcalY: 0.136,
  // Pie chart bottom-left, 32px from left & bottom (approx)
  pieX: 0.394,
  pieY: 0.809,
  titleRotation: 0,
  kcalRotation: 0,
  pieRotation: 0,
  customText: "",
  customColor: "#FFFFFF",
  customFont: "regular",
  customItalic: false,
  customUnderline: false,
  customX: 0.5,
  customY: 0.2,
  customRotation: 0,
  customSize: 18,
};
