export function omitLocalUserKeys<T extends object>(obj: T) {
  const forbidden = ["_changed", "_status", "_raw", "created_at", "id"];
  const result = { ...obj };
  forbidden.forEach((k) => {
    delete (result as any)[k];
  });
  return result;
}
