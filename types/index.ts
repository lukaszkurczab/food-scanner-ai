export type Meal = {
  id: string;
  image: string;
  date: string;
  ingredients: Ingredient[];
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
};
