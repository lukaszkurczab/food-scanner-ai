import { resolveMealImageUrl } from "@services/mealService.images";
import type { Meal } from "@/types/meal";

export async function getMealImage(meal: Meal): Promise<string | null> {
  return resolveMealImageUrl(meal.userUid, meal);
}
