import AsyncStorage from "@react-native-async-storage/async-storage";
import { Meal } from "../types/index";

const HISTORY_KEY = "meal_history";

export async function saveMealToHistory(meal: Meal) {
  const history = await getMealHistory();
  const updated = [meal, ...history];
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function getMealHistory(): Promise<Meal[]> {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export async function getTodayMeal(): Promise<Meal[]> {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  const mealsData = data ? JSON.parse(data) : [];
  const todayMeal = mealsData.filter((meal: Meal) => {
    const mealDate = new Date(meal.date);
    const today = new Date();
    return (
      mealDate.getDate() === today.getDate() &&
      mealDate.getMonth() === today.getMonth() &&
      mealDate.getFullYear() === today.getFullYear()
    );
  });
  return todayMeal;
}

export async function clearMealHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export async function removeMealFromHistory(id: string) {
  const data = await getMealHistory();
  const updated = data.filter((meal) => meal.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
