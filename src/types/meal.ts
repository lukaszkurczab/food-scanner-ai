export type MealSyncStatus = "synced" | "pending" | "conflict";

export interface Meal {
  id: string;
  name: string;
  date: string;
  deleted?: boolean;
  photoUri?: string | null;
  userUid: string;
  source: "local" | "cloud";
  syncStatus: MealSyncStatus;
  lastUpdated: string;
  cloudId?: string;
  nutrition: {
    kcal: number;
    carbs: number;
    fat: number;
    protein: number;
  };
  ingredients: string[];
}
