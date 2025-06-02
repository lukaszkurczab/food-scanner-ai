import { Ingredient, Nutrients } from "../types/index";
import Constants from "expo-constants";

const API_KEY = Constants.expoConfig?.extra?.usdaApiKey;

export async function getNutrientsForIngredient(
  name: string
): Promise<Nutrients | null> {
  const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
    name
  )}&api_key=${API_KEY}`;

  try {
    const res = await fetch(searchUrl);
    const json = await res.json();

    const food = json.foods?.[0];
    if (!food) return null;

    const nutrientsMap: Partial<Nutrients> = {};

    for (const nutrient of food.foodNutrients) {
      switch (nutrient.nutrientName) {
        case "Protein":
          nutrientsMap.protein = nutrient.value;
          break;
        case "Total lipid (fat)":
          nutrientsMap.fat = nutrient.value;
          break;
        case "Carbohydrate, by difference":
          nutrientsMap.carbs = nutrient.value;
          break;
        case "Energy":
          nutrientsMap.kcal = nutrient.value;
          break;
      }
    }

    return {
      kcal: nutrientsMap.kcal ?? 0,
      protein: nutrientsMap.protein ?? 0,
      fat: nutrientsMap.fat ?? 0,
      carbs: nutrientsMap.carbs ?? 0,
    };
  } catch (err) {
    console.error("Błąd w pobieraniu danych USDA:", err);
    return null;
  }
}

export async function calculateTotalNutrients(ingredients: Ingredient[]) {
  let total: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

  for (const item of ingredients) {
    let nutrients;
    if (!item.fromTable) {
      nutrients = await getNutrientsForIngredient(item.name);
    } else {
      nutrients = {
        kcal: item.kcal,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
      };
    }
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
