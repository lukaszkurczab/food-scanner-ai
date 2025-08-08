import AsyncStorage from "@react-native-async-storage/async-storage";
const key = (uid: string, start: number, end: number) =>
  `stats_${uid}_${start}_${end}`;
export async function saveStats(
  uid: string,
  start: Date,
  end: Date,
  payload: any
) {
  try {
    await AsyncStorage.setItem(key(uid, +start, +end), JSON.stringify(payload));
  } catch {}
}
export async function loadStats(uid: string, start: Date, end: Date) {
  try {
    const raw = await AsyncStorage.getItem(key(uid, +start, +end));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
