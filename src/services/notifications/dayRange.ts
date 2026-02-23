export function startOfDayISO(day: Date): string {
  const value = new Date(day);
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

export function endOfDayISO(day: Date): string {
  const value = new Date(day);
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
}

export function getDayISOInclusiveRange(day: Date = new Date()): {
  startIso: string;
  endIso: string;
} {
  return { startIso: startOfDayISO(day), endIso: endOfDayISO(day) };
}

export function isIsoWithinInclusiveRange(
  value: string,
  startIso: string,
  endIso: string,
): boolean {
  return value >= startIso && value <= endIso;
}

