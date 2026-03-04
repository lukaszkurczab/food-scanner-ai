export const orUndef = <T>(v: T | null | undefined): T | undefined =>
  v == null ? undefined : v;

export const arr = <T>(v: T[] | null | undefined): T[] =>
  Array.isArray(v) ? v : [];

export function asEnum<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof val === "string" && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback;
}

export function asEnumNullable<T extends string>(
  val: unknown,
  allowed: readonly T[],
  fallback: T | null = null,
): T | null {
  if (val == null) return null;
  return (allowed as readonly string[]).includes(String(val))
    ? (val as T)
    : fallback;
}

export function todayLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
