import AsyncStorage from "@react-native-async-storage/async-storage";

export async function setJSON(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function getJSON<T = any>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const cacheKeys = {
  myMealsList: (uid: string) => `myMeals:list:${uid}`,
  lastWeekMeals: (uid: string) => `meals:last7d:${uid}`,
};

