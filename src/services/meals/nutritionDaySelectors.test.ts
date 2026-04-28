import { describe, expect, it } from "@jest/globals";
import { buildNutritionDayBucket } from "@/services/meals/nutritionDaySelectors";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { Meal } from "@/types/meal";

const makeMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  cloudId: "meal-1",
  timestamp: "2026-03-18T10:00:00.000Z",
  dayKey: "2026-03-18",
  type: "lunch",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-03-18T10:00:00.000Z",
  updatedAt: "2026-03-18T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  totals: { kcal: 100, protein: 10, fat: 2, carbs: 12 },
  ...overrides,
});

describe("nutritionDaySelectors", () => {
  it("includes a meal only when its canonical dayKey matches the requested day", () => {
    const matchingMeal = makeMeal({
      mealId: "match",
      cloudId: "match",
      dayKey: "2026-03-18",
      timestamp: "2026-03-19T00:30:00.000Z",
    });
    const otherDayMeal = makeMeal({
      mealId: "other-day",
      cloudId: "other-day",
      dayKey: "2026-03-17",
    });

    const bucket = buildNutritionDayBucket([matchingMeal, otherDayMeal], "2026-03-18");

    expect(bucket.dayMeals.map((meal) => meal.cloudId)).toEqual(["match"]);
    expect(bucket.mealCount).toBe(1);
  });

  it("tracks pending, failed, and conflict flags without filtering those meals out", () => {
    const pendingMeal = makeMeal({
      mealId: "pending",
      cloudId: "pending",
      syncState: "pending",
      totals: { kcal: 100, protein: 10, fat: 2, carbs: 12 },
    });
    const failedMeal = makeMeal({
      mealId: "failed",
      cloudId: "failed",
      syncState: "failed",
      totals: { kcal: 200, protein: 20, fat: 4, carbs: 24 },
    });
    const conflictMeal = makeMeal({
      mealId: "conflict",
      cloudId: "conflict",
      syncState: "conflict",
      totals: { kcal: 300, protein: 30, fat: 6, carbs: 36 },
    });

    const bucket = buildNutritionDayBucket(
      [pendingMeal, failedMeal, conflictMeal],
      "2026-03-18",
    );

    expect(bucket.dayMeals.map((meal) => meal.cloudId)).toEqual([
      "pending",
      "failed",
      "conflict",
    ]);
    expect(bucket.hasPending).toBe(true);
    expect(bucket.hasFailed).toBe(true);
    expect(bucket.hasConflict).toBe(true);
  });

  it("returns totals from calculateTotalNutrients for the selected day meals", () => {
    const dayMeals = [
      makeMeal({
        mealId: "ingredient-meal",
        cloudId: "ingredient-meal",
        ingredients: [
          {
            id: "ing-1",
            name: "oats",
            amount: 100,
            kcal: 300,
            carbs: 50,
            fat: 5,
            protein: 10,
          },
        ],
        totals: { kcal: 999, protein: 999, fat: 999, carbs: 999 },
      }),
      makeMeal({
        mealId: "totals-meal",
        cloudId: "totals-meal",
        ingredients: [],
        totals: { kcal: 200, protein: 20, fat: 4, carbs: 24 },
      }),
    ];

    const bucket = buildNutritionDayBucket(dayMeals, "2026-03-18");

    expect(bucket.totals).toEqual(calculateTotalNutrients(bucket.dayMeals));
  });

  it("returns an empty bucket for invalid dayKey input", () => {
    const bucket = buildNutritionDayBucket(
      [
        makeMeal({
          mealId: "canonical",
          cloudId: "canonical",
          dayKey: "2026-03-18",
        }),
      ],
      "2026-03-18T10:00:00.000Z",
    );

    expect(bucket).toEqual({
      dayKey: "",
      dayMeals: [],
      mealCount: 0,
      totals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      hasPending: false,
      hasFailed: false,
      hasConflict: false,
    });
  });

  it("does not include timestamp-only meals in the canonical day bucket", () => {
    const bucket = buildNutritionDayBucket(
      [
        makeMeal({
          mealId: "timestamp-only",
          cloudId: "timestamp-only",
          dayKey: null,
          syncState: "pending",
          totals: { kcal: 150, protein: 15, fat: 3, carbs: 18 },
        }),
      ],
      "2026-03-18",
    );

    expect(bucket.dayMeals).toEqual([]);
    expect(bucket.hasPending).toBe(false);
  });
});
