import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useHistorySectionsData } from "@/feature/History/hooks/useHistorySectionsData";
import type { DaySection } from "@/feature/History/types/daySection";
import type { LocalHistoryFilters } from "@/services/offline/meals.repo";
import type { DataViewState } from "@/types/dataViewState";
import type { Meal } from "@/types/meal";
import {
  __resetLocalMealsStoreForTests,
  removeLocalMealSnapshot,
  upsertLocalMealSnapshot,
} from "@/services/meals/localMealsStore";

const mockGetMealsPageLocalFiltered = jest.fn<
  (
    uid: string,
    options: {
      limit: number;
      beforeISO?: string | null;
      filters?: LocalHistoryFilters;
    },
  ) => Promise<{ items: Meal[]; nextBefore: string | null }>
>();
const mockGetMealByCloudIdLocal = jest.fn<
  (uid: string, cloudId: string) => Promise<Meal | null>
>();
const mockPullChanges = jest.fn<(uid: string) => Promise<void>>();
const mockOn = jest.fn<
  (eventName: string, handler: (event?: unknown) => void) => () => void
>();
const mockResolveDataViewState = jest.fn<
  (params: {
    isLoading: boolean;
    hasData: boolean;
    isOnline: boolean;
    hasError: boolean;
  }) => DataViewState
>();
const mockBuildSectionsMap = jest.fn<
  (
    items: Meal[],
    labels: {
      todayLabel: string;
      yesterdayLabel: string;
      locale?: string;
    },
  ) => Map<string, DaySection>
>();
const mockFilterSectionsByQuery = jest.fn<
  (params: { sectionsMap: Map<string, DaySection>; query: string }) => DaySection[]
>();

let focusEffectCallback: (() => void) | undefined;

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    focusEffectCallback = callback;
  },
}));

jest.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

jest.mock("@/types/dataViewState", () => ({
  resolveDataViewState: (params: {
    isLoading: boolean;
    hasData: boolean;
    isOnline: boolean;
    hasError: boolean;
  }) => mockResolveDataViewState(params),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  getMealsPageLocalFiltered: (
    uid: string,
    options: {
      limit: number;
      beforeISO?: string | null;
      filters?: LocalHistoryFilters;
    },
  ) => mockGetMealsPageLocalFiltered(uid, options),
  getMealByCloudIdLocal: (uid: string, cloudId: string) =>
    mockGetMealByCloudIdLocal(uid, cloudId),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pullChanges: (uid: string) => mockPullChanges(uid),
}));

jest.mock("@/services/core/events", () => ({
  on: (eventName: string, handler: (event?: unknown) => void) =>
    mockOn(eventName, handler),
}));

jest.mock("@/feature/History/services/historySectionsService", () => ({
  buildSectionsMap: (
    items: Meal[],
    labels: {
      todayLabel: string;
      yesterdayLabel: string;
      locale?: string;
    },
  ) => mockBuildSectionsMap(items, labels),
  filterSectionsByQuery: (params: {
    sectionsMap: Map<string, DaySection>;
    query: string;
  }) => mockFilterSectionsByQuery(params),
  addOrUpdateMealInSections: jest.fn(),
  removeMealFromSections: jest.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const buildMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: overrides.mealId ?? "meal-1",
  cloudId: overrides.cloudId ?? overrides.mealId ?? "meal-1",
  timestamp: overrides.timestamp ?? "2026-04-12T10:00:00.000Z",
  type: overrides.type ?? "breakfast",
  name: overrides.name ?? "Meal",
  ingredients: overrides.ingredients ?? [],
  createdAt: overrides.createdAt ?? "2026-04-12T10:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-04-12T10:00:00.000Z",
  syncState: overrides.syncState ?? "synced",
  source: overrides.source ?? "manual",
  ...overrides,
});

describe("useHistorySectionsData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-12T10:00:00.000Z"));
    __resetLocalMealsStoreForTests();
    focusEffectCallback = undefined;

    mockGetMealsPageLocalFiltered.mockResolvedValue({
      items: [],
      nextBefore: null,
    });
    mockGetMealByCloudIdLocal.mockResolvedValue(null);
    mockPullChanges.mockResolvedValue(undefined);
    mockOn.mockReturnValue(() => undefined);
    mockResolveDataViewState.mockReturnValue("empty");
    mockBuildSectionsMap.mockImplementation((items: Meal[]) => {
      const sections: DaySection[] = items.map((item) => ({
        dateKey: item.cloudId || item.mealId,
        title: item.name || "",
        totalKcal: 0,
        data: [item],
      }));
      return new Map(sections.map((section) => [section.dateKey, section]));
    });
    mockFilterSectionsByQuery.mockImplementation(
      ({ sectionsMap }: { sectionsMap: Map<string, DaySection> }) =>
        Array.from(sectionsMap.values()),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    __resetLocalMealsStoreForTests();
  });

  it("throttles focus pull immediately after a forced refresh-triggered pull", async () => {
    renderHook(() =>
      useHistorySectionsData({
        uid: "user-1",
        query: "",
        filters: null,
        todayLabel: "Today",
        yesterdayLabel: "Yesterday",
        locale: "en",
        isOnline: true,
      }),
    );

    await waitFor(() => {
      expect(mockPullChanges).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(mockPullChanges).toHaveBeenCalledTimes(1);

    await act(async () => {
      focusEffectCallback?.();
    });

    expect(mockPullChanges).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(30_001);
      focusEffectCallback?.();
    });

    expect(mockPullChanges).toHaveBeenCalledTimes(2);
  });

  it("ignores stale local loads after filters change", async () => {
    const firstLoad = deferred<{ items: Meal[]; nextBefore: string | null }>();
    const secondLoad = deferred<{ items: Meal[]; nextBefore: string | null }>();

    mockGetMealsPageLocalFiltered
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result, rerender } = renderHook(
      ({ filters }: { filters: { calories: [number, number] } | null }) =>
        useHistorySectionsData({
          uid: "user-1",
          query: "",
          filters,
          todayLabel: "Today",
          yesterdayLabel: "Yesterday",
          locale: "en",
          isOnline: true,
        }),
      {
        initialProps: { filters: null },
      },
    );

    rerender({ filters: { calories: [100, 300] } });

    await act(async () => {
      secondLoad.resolve({
        items: [
          buildMeal({
            mealId: "meal-2",
            name: "Fresh filter result",
            totals: { kcal: 200, protein: 0, carbs: 0, fat: 0 },
          }),
        ],
        nextBefore: null,
      });
      await secondLoad.promise;
    });

    await waitFor(() => {
      expect(result.current.sections).toEqual([
        expect.objectContaining({ title: "Fresh filter result" }),
      ]);
    });

    await act(async () => {
      firstLoad.resolve({
        items: [buildMeal({ mealId: "meal-1", name: "Stale result" })],
        nextBefore: null,
      });
      await firstLoad.promise;
    });

    expect(result.current.sections).toEqual([
      expect.objectContaining({ title: "Fresh filter result" }),
    ]);
  });

  it("uses canonical local meals across dayKeys and keeps pending/failed/delete transitions visible", async () => {
    upsertLocalMealSnapshot(
      "user-1",
      buildMeal({
        mealId: "history-1",
        cloudId: "history-1",
        dayKey: "2026-04-12",
        name: "Breakfast",
        syncState: "synced",
        totals: { kcal: 300, protein: 20, carbs: 25, fat: 10 },
      }),
    );
    upsertLocalMealSnapshot(
      "user-1",
      buildMeal({
        mealId: "history-2",
        cloudId: "history-2",
        dayKey: "2026-04-11",
        timestamp: "2026-04-11T18:00:00.000Z",
        updatedAt: "2026-04-11T18:00:00.000Z",
        name: "Dinner",
        syncState: "synced",
        totals: { kcal: 450, protein: 28, carbs: 35, fat: 18 },
      }),
    );

    const { result } = renderHook(() =>
      useHistorySectionsData({
        uid: "user-1",
        query: "",
        filters: null,
        todayLabel: "Today",
        yesterdayLabel: "Yesterday",
        locale: "en",
        isOnline: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.sections.map((section) => section.title)).toEqual([
        "Breakfast",
        "Dinner",
      ]);
    });

    await act(async () => {
      upsertLocalMealSnapshot(
        "user-1",
        buildMeal({
          mealId: "history-1",
          cloudId: "history-1",
          dayKey: "2026-04-12",
          name: "Breakfast edited offline",
          updatedAt: "2026-04-12T12:00:00.000Z",
          syncState: "pending",
          totals: { kcal: 520, protein: 36, carbs: 42, fat: 20 },
        }),
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.sections[0]?.data[0]).toEqual(
        expect.objectContaining({
          cloudId: "history-1",
          name: "Breakfast edited offline",
          syncState: "pending",
          dayKey: "2026-04-12",
        }),
      );
    });

    await act(async () => {
      upsertLocalMealSnapshot(
        "user-1",
        buildMeal({
          mealId: "history-1",
          cloudId: "history-1",
          dayKey: "2026-04-12",
          name: "Breakfast sync failed",
          updatedAt: "2026-04-12T13:00:00.000Z",
          syncState: "failed",
          totals: { kcal: 520, protein: 36, carbs: 42, fat: 20 },
        }),
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.sections[0]?.data[0]).toEqual(
        expect.objectContaining({
          cloudId: "history-1",
          name: "Breakfast sync failed",
          syncState: "failed",
        }),
      );
    });

    await act(async () => {
      removeLocalMealSnapshot("user-1", "history-2");
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.sections.map((section) => section.title)).toEqual([
        "Breakfast sync failed",
      ]);
    });

    await act(async () => {
      upsertLocalMealSnapshot(
        "user-1",
        buildMeal({
          mealId: "history-2",
          cloudId: "history-2",
          dayKey: "2026-04-11",
          timestamp: "2026-04-11T18:00:00.000Z",
          updatedAt: "2026-04-12T14:00:00.000Z",
          name: "Dinner",
          deleted: true,
          syncState: "failed",
        }),
      );
      await Promise.resolve();
    });

    expect(result.current.sections.map((section) => section.title)).toEqual([
      "Breakfast sync failed",
    ]);
  });
});
