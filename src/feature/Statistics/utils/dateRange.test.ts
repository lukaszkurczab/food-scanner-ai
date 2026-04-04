import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { lastNDaysRange } from "@/feature/Statistics/utils/dateRange";

describe("lastNDaysRange", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 15, 45, 30, 123));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns inclusive n-day range ending today at local midnight", () => {
    const { start, end } = lastNDaysRange(7);

    expect(end.toISOString()).toBe(new Date(2026, 2, 10, 0, 0, 0, 0).toISOString());
    expect(start.toISOString()).toBe(
      new Date(2026, 2, 4, 0, 0, 0, 0).toISOString(),
    );
  });
});
