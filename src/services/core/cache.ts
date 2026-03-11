import AsyncStorage from "@react-native-async-storage/async-storage";

export async function setJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures for best-effort cache.
  }
}

export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const cacheKeys = {
  lastWeekMeals: (uid: string) => `meals:last7d:${uid}`,
};
