export function omitLocalUserKeys<T extends Record<string, unknown>>(obj: T) {
  const forbidden = ["_changed", "_status", "_raw", "created_at", "id"];
  const result: Record<string, unknown> = { ...obj };
  forbidden.forEach((k) => {
    delete result[k];
  });
  return result as T;
}
