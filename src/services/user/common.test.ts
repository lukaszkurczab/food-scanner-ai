import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  arr,
  asEnum,
  asEnumNullable,
  orUndef,
  todayLocal,
} from "@/services/user/common";

describe("user common helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 16, 30, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("normalizes optional values and arrays", () => {
    expect(orUndef("x")).toBe("x");
    expect(orUndef(null)).toBeUndefined();
    expect(arr([1, 2])).toEqual([1, 2]);
    expect(arr(null)).toEqual([]);
  });

  it("parses enums and nullable enums with fallbacks", () => {
    expect(asEnum("a", ["a", "b"] as const, "b")).toBe("a");
    expect(asEnum("x", ["a", "b"] as const, "b")).toBe("b");

    expect(asEnumNullable("a", ["a", "b"] as const, "b")).toBe("a");
    expect(asEnumNullable("x", ["a", "b"] as const, "b")).toBe("b");
    expect(asEnumNullable(null, ["a", "b"] as const)).toBeNull();
  });

  it("formats local date string as yyyy-mm-dd", () => {
    expect(todayLocal()).toBe("2026-03-10");
  });
});
