import { MealHistory } from "../types/index";

export const getTodayMeal = (userHistory: MealHistory[]) => {
  const today = new Date();

  return userHistory.filter((meal) => {
    const mealDate = new Date(meal.date);
    return (
      mealDate.getDate() === today.getDate() &&
      mealDate.getMonth() === today.getMonth() &&
      mealDate.getFullYear() === today.getFullYear()
    );
  });
};
