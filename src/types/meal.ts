export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type MealSource = "ai" | "manual" | "saved" | null;
export type MealSyncState = "synced" | "pending" | "conflict";

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

export interface Meal {
  userUid: string; // per-user
  mealId: string; // lokalny identyfikator posiłku
  timestamp: string; // ISO string (pozostawione)
  type: MealType;
  name: string | null;
  ingredients: Ingredient[];
  createdAt: string; // ISO string (pozostawione)
  updatedAt: string; // ISO string (pozostawione)
  syncState: MealSyncState;
  source: MealSource;
  photoUrl?: string | null;
  notes?: string | null;
  tags?: string[];
  deleted?: boolean;
  cloudId?: string;
}
