import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  endOfDayISO,
  getDayISOInclusiveRange,
  isIsoWithinInclusiveRange,
  startOfDayISO,
} from "@/services/notifications/dayRange";

describe("dayRange", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 14, 30, 15, 777));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns start and end of day ISO values", () => {
    const day = new Date(2026, 2, 10, 14, 30, 15, 777);
    expect(startOfDayISO(day)).toBe(new Date(2026, 2, 10, 0, 0, 0, 0).toISOString());
    expect(endOfDayISO(day)).toBe(
      new Date(2026, 2, 10, 23, 59, 59, 999).toISOString(),
    );
  });

  it("builds inclusive range and validates ISO bounds", () => {
    const { startIso, endIso } = getDayISOInclusiveRange();
    const inside = new Date(2026, 2, 10, 12, 0, 0, 0).toISOString();

    expect(isIsoWithinInclusiveRange(startIso, startIso, endIso)).toBe(true);
    expect(isIsoWithinInclusiveRange(endIso, startIso, endIso)).toBe(true);
    expect(isIsoWithinInclusiveRange(inside, startIso, endIso)).toBe(true);
    expect(
      isIsoWithinInclusiveRange(
        new Date(2026, 2, 9, 23, 59, 59, 999).toISOString(),
        startIso,
        endIso,
      ),
    ).toBe(false);
  });
});
