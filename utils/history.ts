import AsyncStorage from "@react-native-async-storage/async-storage";
import { Meal } from "../types/common";

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

export async function clearMealHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export async function removeMealFromHistory(id: string) {
  const data = await getMealHistory();
  const updated = data.filter((meal) => meal.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
