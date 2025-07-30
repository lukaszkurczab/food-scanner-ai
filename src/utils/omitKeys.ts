export function omitKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> {
  const result = { ...obj };
  keys.forEach((k) => {
    delete (result as any)[k];
  });
  return result;
}
