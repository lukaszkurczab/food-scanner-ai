import { Ingredient, Nutrients } from "../types/index";

export async function calculateTotalNutrients(ingredients: Ingredient[]) {
  let total: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

  for (const item of ingredients) {
    let nutrients = {
      kcal: item.kcal,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
    };

    if (nutrients) {
      const multiplier = item.amount / 100;
      total.kcal += Number((nutrients.kcal * multiplier).toFixed(0));
      total.protein += Number((nutrients.protein * multiplier).toFixed(0));
      total.fat += Number((nutrients.fat * multiplier).toFixed(0));
      total.carbs += Number((nutrients.carbs * multiplier).toFixed(0));
    }
  }

  return total;
}
