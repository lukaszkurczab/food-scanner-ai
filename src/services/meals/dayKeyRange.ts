import {
  formatMealDayKey,
  isCanonicalMealDayKey,
} from "@/services/meals/mealMetadata";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DayKeyRange = {
  startDayKey: string;
  endDayKey: string;
};

function dayKeyToLocalDate(dayKey: string): Date | null {
  if (!isCanonicalMealDayKey(dayKey)) return null;
  const [year, month, day] = dayKey.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDayKeyRange(range: DayKeyRange): DayKeyRange | null {
  if (
    !isCanonicalMealDayKey(range.startDayKey) ||
    !isCanonicalMealDayKey(range.endDayKey)
  ) {
    return null;
  }

  if (range.startDayKey <= range.endDayKey) {
    return range;
  }

  return {
    startDayKey: range.endDayKey,
    endDayKey: range.startDayKey,
  };
}

export function addDaysToDayKey(dayKey: string, days: number): string | null {
  const date = dayKeyToLocalDate(dayKey);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return formatMealDayKey(date);
}

export function buildRecentDayKeyRange(
  days: number,
  endDayKey: string,
): DayKeyRange | null {
  const normalizedDays = Math.max(1, Math.floor(days));
  if (!isCanonicalMealDayKey(endDayKey)) return null;

  const startDayKey = addDaysToDayKey(endDayKey, -normalizedDays + 1);
  if (!startDayKey) return null;

  return {
    startDayKey,
    endDayKey,
  };
}

export function enumerateDayKeys(range: DayKeyRange): string[] {
  const normalized = normalizeDayKeyRange(range);
  if (!normalized) return [];

  const start = dayKeyToLocalDate(normalized.startDayKey);
  const end = dayKeyToLocalDate(normalized.endDayKey);
  if (!start || !end) return [];

  const days = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;

  return Array.from({ length: Math.max(0, days) }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatMealDayKey(date) ?? "";
  }).filter(isCanonicalMealDayKey);
}

export function dayKeyToDate(dayKey: string): Date | null {
  return dayKeyToLocalDate(dayKey);
}

export function clampDayKeyRangeToWindow(
  range: DayKeyRange,
  accessWindowDays: number | null | undefined,
  todayDayKey: string,
): DayKeyRange | null {
  const normalized = normalizeDayKeyRange(range);
  if (!normalized) return null;

  if (!accessWindowDays || accessWindowDays <= 0) {
    return normalized;
  }

  const windowRange = buildRecentDayKeyRange(accessWindowDays, todayDayKey);
  if (!windowRange) return normalized;

  const startDayKey =
    normalized.startDayKey < windowRange.startDayKey
      ? windowRange.startDayKey
      : normalized.startDayKey;
  const endDayKey =
    normalized.endDayKey > windowRange.endDayKey
      ? windowRange.endDayKey
      : normalized.endDayKey;

  if (startDayKey > endDayKey) {
    return {
      startDayKey: windowRange.startDayKey,
      endDayKey: windowRange.startDayKey,
    };
  }

  return {
    startDayKey,
    endDayKey,
  };
}
