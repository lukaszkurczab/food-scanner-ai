export function arrayToJsonString(arr: unknown): string {
  try {
    return JSON.stringify(Array.isArray(arr) ? arr : []);
  } catch {
    return "[]";
  }
}
export function jsonStringToArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}
