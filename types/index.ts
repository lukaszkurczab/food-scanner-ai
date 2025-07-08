export type Meal = {
  id: string;
  name: string;
  date: string;
  ingredients: Ingredient[];
  nutrition: Nutrients;
};

export type MealHistory = {
  id: string;
  name: string;
  date: string;
  ingredients: string[];
  nutrition: Nutrients;
};

export type Nutrients = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Ingredient = {
  name: string;
  amount: number;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  type: "food" | "drink";
  fromTable: boolean;
};
