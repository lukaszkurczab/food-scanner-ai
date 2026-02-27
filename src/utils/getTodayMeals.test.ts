import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types";
import { getTodayMeals } from "@/utils/getTodayMeals";

const createMeal = (overrides: Partial<Meal>): Meal =>
  ({
    userUid: "user-1",
    mealId: "meal-1",
    timestamp: "2026-03-10T08:00:00.000Z",
    type: "breakfast",
    name: null,
    ingredients: [],
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-10T08:00:00.000Z",
    syncState: "synced",
    source: "manual",
    ...overrides,
  }) as Meal;

describe("getTodayMeals", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 12, 0, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns meals with timestamps inside current local day range", () => {
    const inDay = new Date(2026, 2, 10, 8, 30).toISOString();
    const nextDayStart = new Date(2026, 2, 11, 0, 0, 0, 0).toISOString();

    const meals = [
      createMeal({ mealId: "a", timestamp: inDay }),
      createMeal({ mealId: "b", timestamp: nextDayStart }),
    ];

    expect(getTodayMeals(meals).map((meal) => meal.mealId)).toEqual(["a"]);
  });

  it("uses createdAt when timestamp is empty", () => {
    const createdAt = new Date(2026, 2, 10, 9, 15).toISOString();
    const meals = [createMeal({ mealId: "fallback", timestamp: "", createdAt })];

    expect(getTodayMeals(meals).map((meal) => meal.mealId)).toEqual(["fallback"]);
  });

  it("ignores meals with invalid or missing date values", () => {
    const meals = [
      createMeal({ mealId: "invalid", timestamp: "not-a-date" }),
      createMeal({ mealId: "missing", timestamp: "", createdAt: "" }),
    ];

    expect(getTodayMeals(meals)).toEqual([]);
  });

  it("handles numeric timestamps in malformed data", () => {
    const numericTs = new Date(2026, 2, 10, 14, 0).getTime();
    const numericMeal = createMeal({ mealId: "numeric" }) as unknown as {
      [k: string]: unknown;
    };
    numericMeal.timestamp = numericTs;

    const result = getTodayMeals([numericMeal as unknown as Meal]);
    expect(result.map((meal) => meal.mealId)).toEqual(["numeric"]);
  });
});
