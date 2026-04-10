import AsyncStorage from "@react-native-async-storage/async-storage";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const MAX_TTL_MS = 365 * 24 * 60 * 60 * 1000;

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

/**
 * Stores a JSON value with an absolute expiration timestamp.
 */
export async function setJSONWithTTL(
  key: string,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  const normalizedTtlMs = Number.isFinite(ttlMs)
    ? Math.min(Math.max(Math.floor(ttlMs), 1), MAX_TTL_MS)
    : 1;
  const entry: CacheEntry<unknown> = {
    data: value,
    expiresAt: Date.now() + normalizedTtlMs,
  };

  await setJSON(key, entry);
}

/**
 * Reads a JSON value that was stored with TTL and returns null when expired.
 */
export async function getJSONWithTTL<T>(key: string): Promise<T | null> {
  let raw: string | null = null;
  let cached: CacheEntry<T> | null = null;

  try {
    raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    cached = JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }

  if (!cached || typeof cached !== "object") return null;
  if (typeof cached.expiresAt !== "number" || !("data" in cached)) return null;

  if (Date.now() > cached.expiresAt) {
    try {
      const latestRaw = await AsyncStorage.getItem(key);
      if (latestRaw === raw) {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Ignore storage delete failures for best-effort cache.
    }
    return null;
  }

  return cached.data;
}

export const cacheKeys = {
  lastWeekMeals: (uid: string) => `meals:last7d:${uid}`,
  ttlMs: {
    lastWeekMeals: 30 * 60 * 1000,
  },
};
