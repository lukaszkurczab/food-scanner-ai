export function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const dt = Date.now() - start;
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log(`[perf] ${label}: ${dt}ms`);
    }
  });
}
