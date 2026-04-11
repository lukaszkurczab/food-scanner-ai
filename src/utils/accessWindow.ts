export type DateRange = {
  start: Date;
  end: Date;
};

export function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function normalizeDateRange(range: DateRange): DateRange {
  const start = startOfDay(range.start);
  const end = endOfDay(range.end);
  if (start <= end) return { start, end };

  return {
    start: startOfDay(range.end),
    end: endOfDay(range.start),
  };
}

export function getAccessWindowBounds(
  accessWindowDays?: number,
  now: Date = new Date(),
): DateRange | null {
  if (!accessWindowDays || accessWindowDays <= 0) {
    return null;
  }

  const end = endOfDay(now);
  const start = startOfDay(now);
  start.setDate(start.getDate() - accessWindowDays + 1);
  return { start, end };
}

export function getAccessWindowStartDate(
  accessWindowDays?: number,
  now: Date = new Date(),
): Date | undefined {
  return getAccessWindowBounds(accessWindowDays, now)?.start;
}

export function clampDateRangeToAccessWindow(
  range: DateRange,
  accessWindowDays?: number,
  now: Date = new Date(),
): DateRange {
  const normalized = normalizeDateRange(range);
  const windowBounds = getAccessWindowBounds(accessWindowDays, now);
  if (!windowBounds) {
    return normalized;
  }

  const start =
    normalized.start < windowBounds.start ? windowBounds.start : normalized.start;
  const end = normalized.end > windowBounds.end ? windowBounds.end : normalized.end;

  if (start > end) {
    return {
      start: windowBounds.start,
      end: endOfDay(windowBounds.start),
    };
  }

  return { start, end };
}

export function resolveDateRangeWithinAccessWindow(
  range: DateRange | undefined,
  accessWindowDays?: number,
  now: Date = new Date(),
): DateRange | undefined {
  const windowBounds = getAccessWindowBounds(accessWindowDays, now);
  if (!windowBounds) {
    return range ? normalizeDateRange(range) : undefined;
  }

  if (!range) {
    return windowBounds;
  }

  return clampDateRangeToAccessWindow(range, accessWindowDays, now);
}
