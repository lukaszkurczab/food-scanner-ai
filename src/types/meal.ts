export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type MealSource = "ai" | "manual" | "saved" | null;
export type MealSyncState = "synced" | "pending" | "conflict";

export interface Meal {
  mealId: string;
  timestamp: string;
  type: MealType;
  name: string | null;
  ingredients: Ingredient[];
  createdAt: string;
  updatedAt: string;
  syncState: MealSyncState;
  source: MealSource;
  photoUrl?: string | null;
  notes?: string | null;
  tags?: string[];
  deleted?: boolean;
  cloudId?: string;
}

export type Ingredient = {
  name: string;
  amount: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Nutrients = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
};
