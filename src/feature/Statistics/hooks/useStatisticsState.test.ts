import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { useStatisticsState } from "@/feature/Statistics/hooks/useStatisticsState";
import { useMeals } from "@/hooks/useMeals";
import { useStats } from "@/hooks/useStats";
import { lastNDaysRange } from "@/feature/Statistics/utils/dateRange";

jest.mock("@/hooks/useMeals", () => ({
  useMeals: jest.fn(),
}));

jest.mock("@/hooks/useStats", () => ({
  useStats: jest.fn(),
}));

jest.mock("@/feature/Statistics/utils/dateRange", () => ({
  lastNDaysRange: jest.fn(),
}));

const useMealsMock = useMeals as jest.MockedFunction<typeof useMeals>;
const useStatsMock = useStats as jest.MockedFunction<typeof useStats>;
const lastNDaysRangeMock = lastNDaysRange as jest.MockedFunction<typeof lastNDaysRange>;

const meal = (overrides: Partial<Meal>): Meal =>
  ({
    userUid: "user-1",
    mealId: "meal-1",
    timestamp: new Date(2026, 2, 10, 10, 0).toISOString(),
    type: "lunch",
    name: null,
    ingredients: [],
    createdAt: new Date(2026, 2, 10, 10, 0).toISOString(),
    updatedAt: new Date(2026, 2, 10, 10, 0).toISOString(),
    syncState: "synced",
    source: "manual",
    ...overrides,
  }) as Meal;

describe("useStatisticsState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 12, 0, 0, 0));
    lastNDaysRangeMock.mockImplementation((n: number) => ({
      start: new Date(2026, 2, 10 - n, 0, 0, 0, 0),
      end: new Date(2026, 2, 10, 0, 0, 0, 0),
    }));
    useMealsMock.mockReturnValue({
      meals: [],
      getMeals: jest.fn(async () => undefined),
      loading: false,
      addMeal: jest.fn(),
      updateMeal: jest.fn(),
      deleteMeal: jest.fn(),
      duplicateMeal: jest.fn(),
      getUnsyncedMeals: jest.fn(),
      refresh: jest.fn(),
      loadMore: jest.fn(),
      hasMore: false,
    } as never);
    useStatsMock.mockReturnValue({
      labels: ["10.03"],
      caloriesSeries: [0],
      totals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      averages: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      goal: null,
      progressPct: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads meals on mount and exposes default state", async () => {
    const getMeals = jest.fn(async () => undefined);
    useMealsMock.mockReturnValue({
      meals: [],
      getMeals,
      loading: false,
    } as never);

    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: 2000 }),
    );

    await waitFor(() => {
      expect(getMeals).toHaveBeenCalledTimes(1);
    });

    expect(result.current.active).toBe("7d");
    expect(result.current.metric).toBe("kcal");
    expect(result.current.showLineSection).toBe(true);
    expect(result.current.days).toBeGreaterThanOrEqual(1);
    expect(lastNDaysRangeMock).toHaveBeenCalledWith(7);
  });

  it("switches metrics and computes nutrient series from ingredients/totals", () => {
    useMealsMock.mockReturnValue({
      meals: [
        meal({
          mealId: "with-ingredients",
          ingredients: [
            {
              id: "i1",
              name: "a",
              amount: 1,
              kcal: 100,
              protein: 10,
              fat: 5,
              carbs: 7,
            },
          ],
        }),
        meal({
          mealId: "with-totals",
          ingredients: [],
          totals: { kcal: 200, protein: 20, fat: 8, carbs: 12 },
        }),
      ],
      getMeals: jest.fn(),
      loading: false,
    } as never);
    useStatsMock.mockReturnValue({
      labels: ["10.03"],
      caloriesSeries: [300],
      totals: { kcal: 300, protein: 30, fat: 13, carbs: 19 },
      averages: { kcal: 300, protein: 30, fat: 13, carbs: 19 },
      goal: 2000,
      progressPct: 15,
    });

    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: 2000 }),
    );

    expect(result.current.selectedSeries).toEqual([300]);

    act(() => {
      result.current.setMetric("protein");
    });
    expect(result.current.selectedSeries.at(-1)).toBe(30);
    expect(
      result.current.selectedSeries.reduce((sum, value) => sum + value, 0),
    ).toBe(30);

    act(() => {
      result.current.setMetric("carbs");
    });
    expect(result.current.selectedSeries.at(-1)).toBe(19);
    expect(
      result.current.selectedSeries.reduce((sum, value) => sum + value, 0),
    ).toBe(19);
  });

  it("applies access window cutoff and custom range behavior", () => {
    useMealsMock.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
      loading: false,
    } as never);
    useStatsMock.mockReturnValue({
      labels: ["10.03"],
      caloriesSeries: [0],
      totals: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      averages: { kcal: 0, protein: 0, fat: 0, carbs: 0 },
      goal: null,
      progressPct: null,
    });

    const { result } = renderHook(() =>
      useStatisticsState({
        uid: "user-1",
        calorieTarget: null,
        accessWindowDays: 3,
      }),
    );

    expect(result.current.isWindowLimited).toBe(true);
    expect(result.current.empty).toBe(true);

    act(() => {
      result.current.setActive("custom");
      result.current.setCustomRange({
        start: new Date(2026, 2, 10, 0, 0, 0, 0),
        end: new Date(2026, 2, 10, 0, 0, 0, 0),
      });
    });

    expect(result.current.days).toBe(1);
    expect(result.current.showLineSection).toBe(false);
  });

  it("skips loading when uid is missing and when getMeals is not a function", async () => {
    const getMeals = jest.fn(async () => undefined);
    useMealsMock.mockReturnValue({
      meals: [],
      getMeals,
      loading: false,
    } as never);

    const { rerender } = renderHook(
      ({ uid }: { uid: string }) =>
        useStatisticsState({ uid, calorieTarget: 1200 }),
      { initialProps: { uid: "" } },
    );

    await waitFor(() => {
      expect(getMeals).not.toHaveBeenCalled();
    });

    useMealsMock.mockReturnValue({
      meals: [],
      getMeals: undefined,
      loading: false,
    } as never);
    rerender({ uid: "user-1" });

    await waitFor(() => {
      expect(getMeals).not.toHaveBeenCalled();
    });
  });

  it("covers range switching and fallback stat calculations", () => {
    useMealsMock.mockReturnValue({
      meals: [
        meal({
          mealId: "updated-at-fallback",
          timestamp: "",
          updatedAt: new Date(2026, 2, 10, 8, 0).toISOString(),
          ingredients: [undefined as unknown as Meal["ingredients"][number]],
        }),
        meal({
          mealId: "created-at-fallback",
          timestamp: "",
          updatedAt: "",
          createdAt: new Date(2026, 2, 10, 9, 0).toISOString(),
          ingredients: [],
          totals: { kcal: 10, protein: 4, fat: 2, carbs: 3 },
        }),
        meal({
          mealId: "outside-range",
          timestamp: new Date(2026, 1, 1, 9, 0).toISOString(),
          ingredients: [
            {
              id: "out",
              name: "out",
              amount: 1,
              kcal: 100,
              protein: 1,
              fat: 1,
              carbs: 1,
            },
          ],
        }),
      ],
      getMeals: jest.fn(),
      loading: true,
    } as never);

    useStatsMock.mockReturnValue({
      labels: [],
      caloriesSeries: undefined,
      totals: undefined,
      averages: undefined,
      goal: null,
      progressPct: null,
    } as never);

    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: null }),
    );

    act(() => {
      result.current.setActive("30d");
    });
    expect(lastNDaysRangeMock).toHaveBeenCalledWith(30);

    expect(result.current.totalKcal).toBe(0);
    expect(result.current.avgKcal).toBe(0);
    expect(result.current.avgProtein).toBeGreaterThanOrEqual(0);
    expect(result.current.avgCarbs).toBeGreaterThanOrEqual(0);
    expect(result.current.avgFat).toBeGreaterThanOrEqual(0);
    expect(result.current.hasTotals).toBe(false);
    expect(result.current.empty).toBe(false);
    expect(result.current.labels.length).toBeGreaterThan(0);
  });
});
