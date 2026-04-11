import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  clampDateRangeToAccessWindow,
  getAccessWindowBounds,
  resolveDateRangeWithinAccessWindow,
} from "@/utils/accessWindow";

describe("accessWindow helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("builds window bounds for access-limited users", () => {
    const bounds = getAccessWindowBounds(30);

    expect(bounds).toBeTruthy();
    expect(bounds?.start.getFullYear()).toBe(2026);
    expect(bounds?.start.getMonth()).toBe(1);
    expect(bounds?.start.getDate()).toBe(9);
    expect(bounds?.end.getFullYear()).toBe(2026);
    expect(bounds?.end.getMonth()).toBe(2);
    expect(bounds?.end.getDate()).toBe(10);
  });

  it("returns full free window when no explicit range is set", () => {
    const resolved = resolveDateRangeWithinAccessWindow(undefined, 30);

    expect(resolved).toBeTruthy();
    expect(resolved?.start.getMonth()).toBe(1);
    expect(resolved?.start.getDate()).toBe(9);
    expect(resolved?.end.getMonth()).toBe(2);
    expect(resolved?.end.getDate()).toBe(10);
  });

  it("clamps older ranges to the access window", () => {
    const clamped = clampDateRangeToAccessWindow(
      {
        start: new Date("2026-01-01T00:00:00.000Z"),
        end: new Date("2026-01-15T00:00:00.000Z"),
      },
      30,
    );

    expect(clamped.start.getMonth()).toBe(1);
    expect(clamped.start.getDate()).toBe(9);
    expect(clamped.end.getMonth()).toBe(1);
    expect(clamped.end.getDate()).toBe(9);
  });

  it("keeps premium ranges unchanged except for normalization", () => {
    const resolved = resolveDateRangeWithinAccessWindow(
      {
        start: new Date("2026-01-15T00:00:00.000Z"),
        end: new Date("2026-01-01T00:00:00.000Z"),
      },
      undefined,
    );

    expect(resolved?.start.getMonth()).toBe(0);
    expect(resolved?.start.getDate()).toBe(1);
    expect(resolved?.end.getMonth()).toBe(0);
    expect(resolved?.end.getDate()).toBe(15);
  });
});
