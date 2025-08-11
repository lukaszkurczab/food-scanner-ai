// src/utils/syncUtils.ts
import NetInfo from "@react-native-community/netinfo";

/** Prosty retry z backoffem */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseMs = 600 }: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      const wait = baseMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/** Uruchom akcję na starcie online i przy każdym powrocie online */
export function onReconnect(action: () => void) {
  // spróbuj od razu, jeśli online
  NetInfo.fetch().then((state) => {
    if (state.isConnected) action();
  });
  // subskrybuj zmiany
  const unsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) action();
  });
  return unsub;
}
