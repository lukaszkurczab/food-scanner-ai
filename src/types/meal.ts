export type MealsyncState = "synced" | "pending" | "conflict";

export interface Meal {
  id: string;
  name: string;
  date: string;
  deleted?: boolean;
  photoUri?: string | null;
  userUid: string;
  source: "local" | "cloud";
  syncState: MealsyncState;
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
