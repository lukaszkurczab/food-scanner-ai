export type NotificationType = "meal_reminder" | "calorie_goal" | "day_fill";
export type MotivationMode = "minimal" | "full";
export type AIStyle = "none" | "concise" | "friendly" | "detailed";
export type MealKind = "breakfast" | "lunch" | "dinner" | "snack";

export interface UserNotification {
  id: string;
  type: NotificationType;
  name: string;
  text?: string | null;
  time: { hour: number; minute: number };
  days: number[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  mealKind?: MealKind | null;
  kcalByHour?: number | null;
}
