import type { Meal, Nutrients } from "@/src/types";

export function calculateTotalNutrients(meals: Meal[]): Nutrients {
  return meals.reduce(
    (acc, meal) => {
      for (const ing of meal.ingredients) {
        acc.protein += ing.protein;
        acc.fat += ing.fat;
        acc.carbs += ing.carbs;
        acc.kcal += ing.kcal;
      }
      return acc;
    },
    { protein: 0, fat: 0, carbs: 0, kcal: 0 }
  );
}
