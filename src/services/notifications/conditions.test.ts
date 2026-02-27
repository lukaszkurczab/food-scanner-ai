import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { Meal } from "@/types/meal";
import {
  fetchTodayMeals,
  hasAnyMealsToday,
  hasMealTypeToday,
  isCalorieGoalNotMet,
  isKcalBelowThreshold,
  sumConsumedKcal,
} from "@/services/notifications/conditions";
import NetInfo from "@react-native-community/netinfo";
import { getMealsPageLocal } from "@/services/offline/meals.repo";
import { getDocs } from "@react-native-firebase/firestore";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
  },
}));

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => "COLLECTION"),
  query: jest.fn(() => "QUERY"),
  where: jest.fn((field: string, op: string, value: string) => ({
    field,
    op,
    value,
  })),
  getDocs: jest.fn(),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  getMealsPageLocal: jest.fn(),
}));

jest.mock("@/services/notifications/dayRange", () => ({
  getDayISOInclusiveRange: jest.fn(() => ({
    startIso: "2026-03-10T00:00:00.000Z",
    endIso: "2026-03-10T23:59:59.999Z",
  })),
  isIsoWithinInclusiveRange: jest.fn(
    (value: string, startIso: string, endIso: string) =>
      value >= startIso && value <= endIso,
  ),
}));

const netInfoFetchMock = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const getMealsPageLocalMock = getMealsPageLocal as jest.MockedFunction<
  typeof getMealsPageLocal
>;
const getDocsMock = getDocs as jest.MockedFunction<typeof getDocs>;

const validMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-10T10:00:00.000Z",
  type: "lunch",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-03-10T10:00:00.000Z",
  updatedAt: "2026-03-10T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  ...overrides,
});

describe("notifications conditions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles helper predicates and counters", () => {
    const meals = [validMeal({ type: "breakfast" }), validMeal({ type: "dinner" })];

    expect(hasMealTypeToday(meals, "breakfast")).toBe(true);
    expect(hasMealTypeToday(meals, "snack")).toBe(false);

    expect(isKcalBelowThreshold(1200, undefined)).toBe(true);
    expect(isKcalBelowThreshold(1200, 0)).toBe(true);
    expect(isKcalBelowThreshold(1200, 1500)).toBe(true);
    expect(isKcalBelowThreshold(1200, 1000)).toBe(false);

    expect(sumConsumedKcal([validMeal({ totals: { kcal: 200, protein: 0, fat: 0, carbs: 0 } }), validMeal()])).toBe(200);

    expect(isCalorieGoalNotMet(800, undefined)).toBe(false);
    expect(isCalorieGoalNotMet(800, 0)).toBe(false);
    expect(isCalorieGoalNotMet(800, 1000)).toBe(true);
    expect(isCalorieGoalNotMet(1200, 1000)).toBe(false);

    expect(hasAnyMealsToday([])).toBe(false);
    expect(hasAnyMealsToday(meals)).toBe(true);
  });

  it("fetches and filters local meals when offline", async () => {
    netInfoFetchMock.mockResolvedValue({ isConnected: false } as never);
    getMealsPageLocalMock.mockResolvedValue([
      validMeal({ mealId: "inside", timestamp: "2026-03-10T12:00:00.000Z" }),
      validMeal({ mealId: "outside", timestamp: "2026-03-09T23:59:59.000Z" }),
    ]);

    const result = await fetchTodayMeals("user-1");

    expect(getMealsPageLocalMock).toHaveBeenCalledWith("user-1", 200);
    expect(result.map((m) => m.mealId)).toEqual(["inside"]);
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it("fetches remote meals online and filters invalid/deleted entries", async () => {
    netInfoFetchMock.mockResolvedValue({ isConnected: true } as never);
    getDocsMock.mockResolvedValue({
      docs: [
        { data: () => validMeal({ mealId: "ok", deleted: false, name: null }) },
        { data: () => validMeal({ mealId: "deleted", deleted: true }) },
        { data: () => ({ foo: "bar" }) },
      ],
    } as never);

    const result = await fetchTodayMeals("user-1");

    expect(result.map((m) => m.mealId)).toEqual(["ok"]);
    expect(getMealsPageLocalMock).not.toHaveBeenCalled();
    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });
});
