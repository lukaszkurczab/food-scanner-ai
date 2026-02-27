import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types";
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";

const createMeal = (overrides: Partial<Meal>): Meal =>
  ({
    userUid: "user-1",
    mealId: "meal-1",
    timestamp: new Date(2026, 2, 10, 10, 0).toISOString(),
    type: "breakfast",
    name: null,
    ingredients: [],
    createdAt: new Date(2026, 2, 10, 10, 0).toISOString(),
    updatedAt: new Date(2026, 2, 10, 10, 0).toISOString(),
    syncState: "synced",
    source: "manual",
    ...overrides,
  }) as Meal;

describe("getLastNDaysAggregated", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 12, 0, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("aggregates kcal for local day buckets", () => {
    const yesterday = new Date(2026, 2, 9, 8, 0).toISOString();
    const today = new Date(2026, 2, 10, 9, 0).toISOString();

    const meals = [
      createMeal({
        mealId: "day-1",
        timestamp: yesterday,
        ingredients: [
          {
            id: "ing-1",
            name: "item-a",
            amount: 1,
            kcal: 100,
            carbs: 0,
            fat: 0,
            protein: 0,
          },
          {
            id: "ing-2",
            name: "item-b",
            amount: 1,
            kcal: 50,
            carbs: 0,
            fat: 0,
            protein: 0,
          },
        ],
      }),
      createMeal({
        mealId: "day-2",
        timestamp: today,
        ingredients: JSON.stringify([{ kcal: 200 }, { kcal: "30" }]) as unknown as Meal["ingredients"],
      }),
      createMeal({
        mealId: "invalid-json",
        timestamp: today,
        ingredients: "{broken}" as unknown as Meal["ingredients"],
      }),
      createMeal({
        mealId: "invalid-date",
        timestamp: "not-a-date",
      }),
    ];

    const result = getLastNDaysAggregated(meals, 2, "kcal");

    expect(result.labels).toHaveLength(2);
    expect(result.data).toEqual([150, 230]);
  });

  it("aggregates nutrients and uses createdAt fallback when timestamp is blank", () => {
    const todayCreatedAt = new Date(2026, 2, 10, 11, 0).toISOString();

    const meals = [
      createMeal({
        mealId: "totals-only",
        timestamp: "",
        createdAt: todayCreatedAt,
        ingredients: [],
        totals: {
          kcal: 400,
          carbs: 40,
          fat: 10,
          protein: 20,
        },
      }),
    ];

    const result = getLastNDaysAggregated(meals, 1, "nutrients");

    expect(result.data).toEqual([
      { kcal: 400, carbs: 40, fat: 10, protein: 20 },
    ]);
  });

  it("handles numeric timestamp values in malformed input", () => {
    const todayMs = new Date(2026, 2, 10, 13, 0).getTime();
    const malformed = createMeal({ mealId: "numeric-ts" }) as unknown as {
      [k: string]: unknown;
    };
    malformed.timestamp = todayMs;

    const result = getLastNDaysAggregated([malformed as unknown as Meal], 1, "kcal");
    expect(result.data).toEqual([0]);
  });

  it("uses weekday labels for short ranges and month-day labels for longer ranges", () => {
    const dateSpy = jest
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockImplementation((_locale, options?: Intl.DateTimeFormatOptions) =>
        options?.weekday ? "weekday-label" : "month-day-label",
      );

    const shortRange = getLastNDaysAggregated([], 7, "kcal");
    const longRange = getLastNDaysAggregated([], 8, "kcal");

    expect(shortRange.labels.every((label) => label === "weekday-label")).toBe(true);
    expect(longRange.labels.every((label) => label === "month-day-label")).toBe(true);
    expect(dateSpy).toHaveBeenCalled();
  });

  it("covers default args and malformed timestamp/ingredients payloads", () => {
    const today = new Date(2026, 2, 10, 10, 0).toISOString();
    const malformedWithoutTimestamp = createMeal({
      mealId: "fallback-created-at",
      timestamp: undefined as unknown as string,
      createdAt: today,
      ingredients: null as unknown as Meal["ingredients"],
    });
    const malformedSerializedObject = createMeal({
      mealId: "serialized-object",
      timestamp: today,
      ingredients: JSON.stringify({ kcal: 123 }) as unknown as Meal["ingredients"],
    });
    const malformedKcal = createMeal({
      mealId: "nan-kcal",
      timestamp: today,
      ingredients: [{ kcal: "oops" }] as unknown as Meal["ingredients"],
    });
    const malformedMissingAllDates = createMeal({
      mealId: "missing-dates",
      timestamp: undefined as unknown as string,
      createdAt: "",
    });

    const result = getLastNDaysAggregated([
      malformedWithoutTimestamp,
      malformedSerializedObject,
      malformedKcal,
      malformedMissingAllDates,
    ]);

    expect(result.labels).toHaveLength(7);
    expect(result.data).toHaveLength(7);
    expect(result.data.every((value) => value === 0)).toBe(true);
  });
});
