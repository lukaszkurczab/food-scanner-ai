export type BadgeType = "streak" | "premium";

export type BadgeId =
  | "streak_7"
  | "streak_30"
  | "streak_90"
  | "streak_180"
  | "streak_365"
  | "streak_500"
  | "streak_1000"
  | "premium_start"
  | "premium_90d"
  | "premium_365d"
  | "premium_730d";

export type Badge = {
  id: BadgeId;
  type: BadgeType;
  label: string;
  milestone: number | string;
  icon: string;
  color: string;
  unlockedAt: number;
};
