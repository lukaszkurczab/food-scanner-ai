import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
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
const lastNDaysRangeMock = lastNDaysRange as jest.MockedFunction<
  typeof lastNDaysRange
>;

const makeMeal = (overrides: Partial<Meal>): Meal =>
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
      start: new Date(2026, 2, 10 - n + 1, 0, 0, 0, 0),
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
      labels: ["Mon"],
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

  it("relies on useMeals as the canonical loader and returns default 7-day state", async () => {
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
      expect(result.current.days).toBe(7);
    });

    expect(getMeals).not.toHaveBeenCalled();
    expect(result.current.active).toBe("7d");
    expect(result.current.metric).toBe("kcal");
    expect(result.current.emptyKind).toBe("no_history");
    expect(result.current.days).toBe(7);
    expect(lastNDaysRangeMock).toHaveBeenCalledWith(7);
  });

  it("computes metric series and updates selected metric", () => {
    useMealsMock.mockReturnValue({
      meals: [
        makeMeal({
          ingredients: [
            {
              id: "ing-1",
              name: "Egg",
              amount: 1,
              kcal: 120,
              protein: 12,
              fat: 6,
              carbs: 1,
            },
          ],
        }),
        makeMeal({
          mealId: "meal-2",
          ingredients: [],
          totals: { kcal: 180, protein: 18, carbs: 9, fat: 5 },
        }),
      ],
      getMeals: jest.fn(),
      loading: false,
    } as never);

    useStatsMock.mockReturnValue({
      labels: ["Mon"],
      caloriesSeries: [300],
      totals: { kcal: 300, protein: 30, fat: 11, carbs: 10 },
      averages: { kcal: 300, protein: 30, fat: 11, carbs: 10 },
      goal: 2000,
      progressPct: 15,
    });

    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: 2000 }),
    );

    expect(result.current.emptyKind).toBe("none");
    expect(result.current.selectedSeries).toEqual([0, 0, 0, 0, 0, 0, 300]);
    expect(result.current.metricAverage).toBe(300);

    act(() => {
      result.current.setMetric("protein");
    });

    expect(result.current.metric).toBe("protein");
    expect(
      result.current.selectedSeries[result.current.selectedSeries.length - 1],
    ).toBe(30);
    expect(result.current.metricAverage).toBe(30);
  });

  it("keeps pending meals visible in statistics after local save", () => {
    const pendingMeal = makeMeal({
      mealId: "pending-meal",
      cloudId: "pending-cloud",
      syncState: "pending",
      totals: { kcal: 420, protein: 31, carbs: 44, fat: 12 },
    });

    useMealsMock.mockReturnValue({
      meals: [pendingMeal],
      getMeals: jest.fn(),
      loading: false,
    } as never);

    useStatsMock.mockReturnValue({
      labels: ["Tue"],
      caloriesSeries: [420],
      totals: { kcal: 420, protein: 31, fat: 12, carbs: 44 },
      averages: { kcal: 420, protein: 31, fat: 12, carbs: 44 },
      goal: 2000,
      progressPct: 21,
    });

    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: 2000 }),
    );

    expect(useStatsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ syncState: "pending" })],
      expect.any(Object),
      2000,
    );
    expect(result.current.emptyKind).toBe("none");
    expect(result.current.hasEntriesInRange).toBe(true);
    expect(result.current.selectedSeries).toEqual([0, 0, 0, 0, 0, 0, 420]);
  });

  it("counts a late-night meal in the selected day from dayKey", () => {
    jest.setSystemTime(new Date(2026, 2, 18, 12, 0, 0, 0));
    lastNDaysRangeMock.mockImplementation(() => ({
      start: new Date(2026, 2, 18, 0, 0, 0, 0),
      end: new Date(2026, 2, 18, 0, 0, 0, 0),
    }));

    useMealsMock.mockReturnValue({
      meals: [
        makeMeal({
          mealId: "late-night",
          dayKey: "2026-03-18",
          timestamp: "2026-03-19T00:30:00.000Z",
          ingredients: [
            {
              id: "ing-late",
              name: "Late snack",
              amount: 1,
              kcal: 120,
              protein: 9,
              fat: 4,
              carbs: 10,
            },
          ],
        }),
      ],
      getMeals: jest.fn(),
      loading: false,
    } as never);

    useStatsMock.mockReturnValue({
      labels: ["Wed"],
      caloriesSeries: [120],
      totals: { kcal: 120, protein: 9, fat: 4, carbs: 10 },
      averages: { kcal: 120, protein: 9, fat: 4, carbs: 10 },
      goal: 2000,
      progressPct: 6,
    });

    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: 2000 }),
    );

    act(() => {
      result.current.setMetric("protein");
    });

    expect(result.current.emptyKind).toBe("none");
    expect(result.current.hasEntriesInRange).toBe(true);
    expect(result.current.selectedSeries).toEqual([9]);
  });

  it("marks limited window and no_entries_in_range when user has history outside selected range", () => {
    lastNDaysRangeMock.mockImplementation(() => ({
      start: new Date(2026, 2, 1, 0, 0, 0, 0),
      end: new Date(2026, 2, 10, 0, 0, 0, 0),
    }));

    useMealsMock.mockReturnValue({
      meals: [
        makeMeal({
          mealId: "old",
          timestamp: new Date(2026, 1, 10, 12, 0, 0, 0).toISOString(),
        }),
      ],
      getMeals: jest.fn(),
      loading: false,
    } as never);

    useStatsMock.mockReturnValue({
      labels: ["Mar 8", "Mar 9", "Mar 10"],
      caloriesSeries: [0, 0, 0],
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
    expect(result.current.emptyKind).toBe("no_entries_in_range");
    expect(result.current.hasAnyMeals).toBe(true);
    expect(result.current.hasEntriesInRange).toBe(false);
  });

  it("normalizes custom range and keeps custom tab active", () => {
    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: null }),
    );

    act(() => {
      result.current.setActive("custom");
      result.current.setCustomRange({
        start: new Date(2026, 2, 12, 0, 0, 0, 0),
        end: new Date(2026, 2, 10, 0, 0, 0, 0),
      });
    });

    expect(result.current.active).toBe("custom");
    expect(result.current.customRange.start.getTime()).toBeLessThanOrEqual(
      result.current.customRange.end.getTime(),
    );
  });

  it("clamps free custom range to the access window", () => {
    const { result } = renderHook(() =>
      useStatisticsState({
        uid: "user-1",
        calorieTarget: null,
        accessWindowDays: 30,
      }),
    );

    act(() => {
      result.current.setActive("custom");
      result.current.setCustomRange({
        start: new Date(2026, 0, 1, 0, 0, 0, 0),
        end: new Date(2026, 0, 15, 0, 0, 0, 0),
      });
    });

    expect(result.current.customRange.start.getFullYear()).toBe(2026);
    expect(result.current.customRange.start.getMonth()).toBe(1);
    expect(result.current.customRange.start.getDate()).toBe(9);
    expect(result.current.customRange.end.getFullYear()).toBe(2026);
    expect(result.current.customRange.end.getMonth()).toBe(1);
    expect(result.current.customRange.end.getDate()).toBe(9);
  });

  it("keeps premium custom range unchanged", () => {
    const { result } = renderHook(() =>
      useStatisticsState({ uid: "user-1", calorieTarget: null }),
    );

    act(() => {
      result.current.setActive("custom");
      result.current.setCustomRange({
        start: new Date(2026, 0, 1, 0, 0, 0, 0),
        end: new Date(2026, 0, 15, 0, 0, 0, 0),
      });
    });

    expect(result.current.customRange.start.getMonth()).toBe(0);
    expect(result.current.customRange.start.getDate()).toBe(1);
    expect(result.current.customRange.end.getMonth()).toBe(0);
    expect(result.current.customRange.end.getDate()).toBe(15);
  });
});
