import { describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { getStatsForRange } from "@/feature/Statistics/utils/getStatsForRange";

const createMeal = (overrides: Partial<Meal>): Meal =>
  ({
    userUid: "user-1",
    mealId: "meal-1",
    timestamp: new Date(2026, 2, 2, 12, 0).toISOString(),
    dayKey: "2026-03-02",
    type: "breakfast",
    name: null,
    ingredients: [],
    createdAt: new Date(2026, 2, 2, 12, 0).toISOString(),
    updatedAt: new Date(2026, 2, 2, 12, 0).toISOString(),
    syncState: "synced",
    source: "manual",
    ...overrides,
  }) as Meal;

describe("getStatsForRange", () => {
  it("aggregates totals, series and progress for short ranges", () => {
    const toLocaleSpy = jest
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockImplementation((_locale, options?: Intl.DateTimeFormatOptions) =>
        options?.weekday ? "weekday" : "month-day",
      );

    const range = {
      start: new Date(2026, 2, 1, 12, 0),
      end: new Date(2026, 2, 3, 12, 0),
    };

    const meals: Meal[] = [
      createMeal({
        mealId: "day2-seconds",
        timestamp: Math.floor(new Date(2026, 2, 2, 9, 0).getTime() / 1000) as unknown as string,
        dayKey: "2026-03-02",
        ingredients: [
          {
            id: "i1",
            name: "a",
            amount: 1,
            kcal: 200,
            protein: 20,
            fat: 10,
            carbs: 5,
          },
        ],
      }),
      createMeal({
        mealId: "day3-canonical-day-key",
        timestamp: undefined as unknown as string,
        updatedAt: undefined as unknown as string,
        createdAt: new Date(2026, 2, 3, 9, 0).toISOString(),
        dayKey: "2026-03-03",
        ingredients: [],
        totals: {
          kcal: 300,
          protein: 30,
          fat: 20,
          carbs: 10,
        },
      }),
      createMeal({
        mealId: "invalid",
        timestamp: "bad-date",
        dayKey: null,
      }),
      createMeal({
        mealId: "out-of-range",
        timestamp: new Date(2026, 2, 10, 9, 0).toISOString(),
        dayKey: "2026-03-10",
      }),
    ];

    const result = getStatsForRange(meals, range, 500);

    expect(result.labels).toEqual(["weekday", "weekday", "weekday"]);
    expect(result.caloriesSeries).toEqual([0, 200, 300]);
    expect(result.totals).toEqual({
      kcal: 500,
      protein: 50,
      fat: 30,
      carbs: 15,
    });
    expect(result.averages).toEqual({
      kcal: 250,
      protein: 25,
      fat: 15,
      carbs: 8,
    });
    expect(result.goal).toBe(500);
    expect(result.progressPct).toBe(50);
    expect(toLocaleSpy).toHaveBeenCalled();
  });

  it("uses long-range labels and null progress when goal is missing", () => {
    const toLocaleSpy = jest
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockImplementation((_locale, options?: Intl.DateTimeFormatOptions) =>
        options?.month ? "month-day" : "weekday",
      );

    const range = {
      start: new Date(2026, 1, 1, 12, 0),
      end: new Date(2026, 1, 10, 12, 0),
    };

    const result = getStatsForRange([], range, null);

    expect(result.labels).toHaveLength(10);
    expect(result.labels.every((label) => label === "month-day")).toBe(true);
    expect(result.caloriesSeries).toEqual(Array.from({ length: 10 }, () => 0));
    expect(result.totals).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
    expect(result.averages).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
    expect(result.goal).toBeNull();
    expect(result.progressPct).toBeNull();
    expect(toLocaleSpy).toHaveBeenCalled();
  });

  it("covers numeric millisecond timestamps and nutrient zero-fallback paths", () => {
    const range = {
      start: new Date(2026, 2, 5, 12, 0),
      end: new Date(2026, 2, 5, 12, 0),
    };
    const msTs = new Date(2026, 2, 5, 10, 0).getTime();

    const meals: Meal[] = [
      createMeal({
        mealId: "nan-kcal",
        timestamp: msTs as unknown as string,
        dayKey: "2026-03-05",
        ingredients: [
          {
            id: "nan",
            name: "nan",
            amount: 1,
            kcal: "oops" as unknown as number,
            protein: 0,
            fat: 0,
            carbs: 0,
          },
        ],
      }),
      createMeal({
        mealId: "protein-only",
        timestamp: msTs as unknown as string,
        dayKey: "2026-03-05",
        ingredients: [
          {
            id: "p",
            name: "p",
            amount: 1,
            kcal: 0,
            protein: 5,
            fat: 0,
            carbs: 0,
          },
        ],
      }),
      createMeal({
        mealId: "fat-only",
        timestamp: msTs as unknown as string,
        dayKey: "2026-03-05",
        ingredients: [
          {
            id: "f",
            name: "f",
            amount: 1,
            kcal: 0,
            protein: 0,
            fat: 2,
            carbs: 0,
          },
        ],
      }),
      createMeal({
        mealId: "carbs-only",
        timestamp: msTs as unknown as string,
        dayKey: "2026-03-05",
        ingredients: [
          {
            id: "c",
            name: "c",
            amount: 1,
            kcal: 0,
            protein: 0,
            fat: 0,
            carbs: 3,
          },
        ],
      }),
      createMeal({
        mealId: "nullish-raw",
        timestamp: undefined as unknown as string,
        updatedAt: undefined as unknown as string,
        createdAt: undefined as unknown as string,
        dayKey: null,
      }),
    ];

    const result = getStatsForRange(meals, range, 0);

    expect(result.caloriesSeries).toEqual([0]);
    expect(result.totals).toEqual({
      kcal: 0,
      protein: 5,
      fat: 2,
      carbs: 3,
    });
    expect(result.averages).toEqual({
      kcal: 0,
      protein: 5,
      fat: 2,
      carbs: 3,
    });
    expect(result.progressPct).toBeNull();
  });

  it("uses dayKey for late-night meals whose timestamp falls on a neighboring day", () => {
    const range = {
      start: new Date(2026, 2, 18, 12, 0),
      end: new Date(2026, 2, 18, 12, 0),
    };

    const result = getStatsForRange(
      [
        createMeal({
          mealId: "late-night",
          dayKey: "2026-03-18",
          timestamp: "2026-03-19T00:30:00.000Z",
          ingredients: [
            {
              id: "late",
              name: "Late snack",
              amount: 1,
              kcal: 180,
              protein: 12,
              fat: 8,
              carbs: 15,
            },
          ],
        }),
      ],
      range,
      2000,
    );

    expect(result.caloriesSeries).toEqual([180]);
    expect(result.totals).toEqual({
      kcal: 180,
      protein: 12,
      fat: 8,
      carbs: 15,
    });
  });
});
