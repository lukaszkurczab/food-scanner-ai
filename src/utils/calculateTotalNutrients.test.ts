import { describe, expect, it } from "@jest/globals";
import type { Meal } from "@/types";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";

const baseMeal: Meal = {
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-02-26T10:00:00.000Z",
  type: "breakfast",
  name: null,
  ingredients: [],
  createdAt: "2026-02-26T10:00:00.000Z",
  updatedAt: "2026-02-26T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
};

const createMeal = (overrides: Partial<Meal>): Meal => ({
  ...baseMeal,
  ...overrides,
});

describe("calculateTotalNutrients", () => {
  it("sums nutrients from ingredients across meals", () => {
    const meals: Meal[] = [
      createMeal({
        mealId: "meal-a",
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
          {
            id: "ing-2",
            name: "milk",
            amount: 200,
            kcal: 120,
            carbs: 10,
            fat: 4,
            protein: 8,
          },
        ],
      }),
      createMeal({
        mealId: "meal-b",
        ingredients: [
          {
            id: "ing-3",
            name: "egg",
            amount: 60,
            kcal: 90,
            carbs: 1,
            fat: 6,
            protein: 8,
          },
        ],
      }),
    ];

    expect(calculateTotalNutrients(meals)).toEqual({
      kcal: 510,
      carbs: 61,
      fat: 15,
      protein: 26,
    });
  });

  it("uses meal totals when ingredients array is empty", () => {
    const meals: Meal[] = [
      createMeal({
        ingredients: [],
        totals: {
          kcal: 400,
          carbs: 40,
          fat: 10,
          protein: 30,
        },
      }),
    ];

    expect(calculateTotalNutrients(meals)).toEqual({
      kcal: 400,
      carbs: 40,
      fat: 10,
      protein: 30,
    });
  });

  it("handles missing nutrient values as zero", () => {
    const meals: Meal[] = [
      createMeal({
        mealId: "meal-c",
        ingredients: [],
        totals: {
          kcal: 100,
          carbs: 20,
          fat: 5,
          protein: 10,
        },
      }),
      createMeal({
        mealId: "meal-d",
        ingredients: [
          {
            id: "ing-4",
            name: "unknown",
            amount: 10,
            kcal: 20,
            carbs: 0,
            fat: 0,
            protein: 0,
          },
        ],
      }),
    ];

    expect(calculateTotalNutrients(meals)).toEqual({
      kcal: 120,
      carbs: 20,
      fat: 5,
      protein: 10,
    });
  });

  it("falls back to empty ingredient list when ingredients is not an array", () => {
    const malformedMeal = {
      ...createMeal({
        mealId: "meal-e",
        totals: { kcal: 50, carbs: 6, fat: 2, protein: 3 },
      }),
      ingredients: undefined,
    } as unknown as Meal;

    expect(calculateTotalNutrients([malformedMeal])).toEqual({
      kcal: 50,
      carbs: 6,
      fat: 2,
      protein: 3,
    });
  });

  it("uses zero fallback for undefined nutrient fields", () => {
    const mealWithUndefinedTotals = createMeal({
      mealId: "meal-f",
      ingredients: [],
      totals: {
        kcal: undefined as unknown as number,
        carbs: undefined as unknown as number,
        fat: undefined as unknown as number,
        protein: undefined as unknown as number,
      },
    });

    const mealWithUndefinedIngredientValues = createMeal({
      mealId: "meal-g",
      ingredients: [
        {
          id: "ing-5",
          name: "partial",
          amount: 10,
          kcal: undefined as unknown as number,
          carbs: undefined as unknown as number,
          fat: undefined as unknown as number,
          protein: undefined as unknown as number,
        },
      ],
    });

    expect(
      calculateTotalNutrients([
        mealWithUndefinedTotals,
        mealWithUndefinedIngredientValues,
      ]),
    ).toEqual({
      kcal: 0,
      carbs: 0,
      fat: 0,
      protein: 0,
    });
  });
});
