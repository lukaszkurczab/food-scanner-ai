import type { Meal, Nutrients } from "@/types";

export function calculateTotalNutrients(meals: Meal[]): Nutrients {
  return meals.reduce<Nutrients>(
    (acc, meal) => {
      const ings = Array.isArray(meal.ingredients) ? meal.ingredients : [];
      if (ings.length === 0 && meal.totals) {
        acc.kcal += meal.totals.kcal ?? 0;
        acc.carbs += meal.totals.carbs ?? 0;
        acc.fat += meal.totals.fat ?? 0;
        acc.protein += meal.totals.protein ?? 0;
        return acc;
      }
      for (const ing of ings) {
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
