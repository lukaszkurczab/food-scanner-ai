export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type MealSource = "ai" | "manual" | "saved" | null;
export type MealSyncState = "synced" | "pending" | "conflict";

export interface Meal {
  name: string | null;
  mealId: string;
  timestamp: string;
  type: MealType;
  photoUrl?: string | null;
  notes?: string | null;
  ingredients: Ingredient[];
  createdAt: string;
  updatedAt: string;
  source?: MealSource;
  syncState?: MealSyncState;
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
