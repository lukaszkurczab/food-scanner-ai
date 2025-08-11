import type { Meal, Nutrients } from "@/src/types";

export function calculateTotalNutrients(meals: Meal[]): Nutrients {
  return meals.reduce<Nutrients>(
    (acc, meal) => {
      for (const ing of meal.ingredients) {
        acc.kcal += ing.kcal ?? 0;
        acc.carbs += ing.carbs ?? 0;
        acc.fat += ing.fat ?? 0;
        acc.protein += ing.protein ?? 0;
      }
      return acc;
    },
    { protein: 0, fat: 0, carbs: 0, kcal: 0 }
  );
}
