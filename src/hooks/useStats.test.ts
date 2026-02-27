import { renderHook } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { useStats } from "@/hooks/useStats";
import { getStatsForRange } from "@/feature/Statistics/utils/getStatsForRange";

jest.mock("@/feature/Statistics/utils/getStatsForRange", () => ({
  getStatsForRange: jest.fn(),
}));

const getStatsForRangeMock = getStatsForRange as jest.MockedFunction<
  typeof getStatsForRange
>;

const meal: Meal = {
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-10T10:00:00.000Z",
  type: "lunch",
  name: null,
  ingredients: [],
  createdAt: "2026-03-10T10:00:00.000Z",
  updatedAt: "2026-03-10T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
};

describe("useStats", () => {
  it("returns memoized stats result and recalculates when dependencies change", () => {
    const meals = [meal];
    const range = { start: new Date(2026, 2, 1), end: new Date(2026, 2, 7) };
    const statsA = {
      labels: ["Mon"],
      caloriesSeries: [100],
      totals: { kcal: 100, protein: 10, fat: 4, carbs: 8 },
      averages: { kcal: 100, protein: 10, fat: 4, carbs: 8 },
      goal: 200,
      progressPct: 50,
    };
    const statsB = {
      ...statsA,
      progressPct: 60,
    };

    getStatsForRangeMock.mockReturnValueOnce(statsA).mockReturnValueOnce(statsB);

    const { result, rerender } = renderHook(
      ({
        hookMeals,
        hookRange,
        hookGoal,
      }: {
        hookMeals: Meal[];
        hookRange: { start: Date; end: Date };
        hookGoal?: number | null;
      }) => useStats(hookMeals, hookRange, hookGoal),
      { initialProps: { hookMeals: meals, hookRange: range, hookGoal: 200 } },
    );

    expect(result.current).toBe(statsA);
    expect(getStatsForRangeMock).toHaveBeenCalledTimes(1);
    expect(getStatsForRangeMock).toHaveBeenCalledWith(meals, range, 200);

    rerender({ hookMeals: meals, hookRange: range, hookGoal: 200 });
    expect(result.current).toBe(statsA);
    expect(getStatsForRangeMock).toHaveBeenCalledTimes(1);

    rerender({ hookMeals: meals, hookRange: range, hookGoal: 250 });
    expect(result.current).toBe(statsB);
    expect(getStatsForRangeMock).toHaveBeenCalledTimes(2);
    expect(getStatsForRangeMock).toHaveBeenLastCalledWith(meals, range, 250);
  });
});
