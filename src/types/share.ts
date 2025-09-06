export type ShareFilter = "none" | "bw" | "sepia" | "cool" | "warm";
export type ShareElement = "title" | "kcal" | "pie";

export type ShareOptions = {
  showTitle: boolean;
  showKcal: boolean;
  showPie: boolean;
  filter: ShareFilter;
  titleSize: number;
  titleColor?: string;
  titleWeight?: "regular" | "bold" | "medium";
  kcalSize: number;
  kcalColor?: string;
  kcalWeight?: "regular" | "bold" | "medium";
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
};

export const defaultShareOptions: ShareOptions = {
  showTitle: true,
  showKcal: true,
  showPie: true,
  filter: "none",
  titleSize: 28,
  titleColor: "#FFFFFF",
  titleWeight: "bold",
  kcalSize: 22,
  kcalColor: "#FFFFFF",
  kcalWeight: "bold",
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
};
