import { Meal } from "@/src/types/meal";

type Ingredient = {
  amount: number;
  carbs: number;
  fat: number;
  kcal: number;
  protein: number;
  [key: string]: any;
};

type NutrientSums = {
  kcal: number;
  carbs: number;
  fat: number;
  protein: number;
};

export const calculateTotalNutrients = (data: Meal[]): NutrientSums => {
  return data.reduce(
    (totals, entry) => {
      entry.ingredients.forEach((item) => {
        const factor = item.amount !== 0 ? item.amount / 100 : 1;

        totals.kcal += item.kcal * factor;
        totals.carbs += item.carbs * factor;
        totals.fat += item.fat * factor;
        totals.protein += item.protein * factor;
      });

      return totals;
    },
    { kcal: 0, carbs: 0, fat: 0, protein: 0 }
  );
};
