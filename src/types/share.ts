export type ShareFilter = "none" | "bw" | "sepia" | "cool" | "warm";
export type ShareElement = "title" | "kcal" | "pie";

export type ShareOptions = {
  showTitle: boolean;
  showKcal: boolean;
  showPie: boolean;
  filter: ShareFilter;
  titleSize: number;
  kcalSize: number;
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
  kcalSize: 22,
  pieSize: 0.55,
  titleX: 0.08,
  titleY: 0.08,
  kcalX: 0.08,
  kcalY: 0.18,
  pieX: 0.5,
  pieY: 0.6,
  titleRotation: 0,
  kcalRotation: 0,
  pieRotation: 0,
};
