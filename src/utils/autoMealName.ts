import { useMemo } from "react";
import type { MealType } from "@/src/types/meal";

export function autoMealName(mealType?: MealType) {
  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    let autoType: string;

    if (hour >= 5 && hour < 11) {
      autoType = "breakfast";
    } else if (hour >= 11 && hour < 15) {
      autoType = "lunch";
    } else if (hour >= 15 && hour < 20) {
      autoType = "dinner";
    } else if (hour >= 20 || hour < 5) {
      autoType = "snack";
    } else {
      autoType = "";
    }

    const finalType = mealType || autoType;

    let typeName = "Meal";
    switch (finalType) {
      case "breakfast":
        typeName = "Breakfast";
        break;
      case "lunch":
        typeName = "Lunch";
        break;
      case "dinner":
        typeName = "Dinner";
        break;
      case "snack":
        typeName = "Snack";
        break;
    }

    return `${typeName}`;
  }, [mealType]);
}
