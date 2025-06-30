import { Meal } from "../types/index";

export function getTodayMeal(mealsData: Meal[]): Meal[] {
  const today = new Date();

  return mealsData.filter((meal: Meal) => {
    const mealDate = new Date(meal.date);
    return (
      mealDate.getDate() === today.getDate() &&
      mealDate.getMonth() === today.getMonth() &&
      mealDate.getFullYear() === today.getFullYear()
    );
  });
}
