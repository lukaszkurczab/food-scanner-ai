import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useHistorySectionsData } from "@/feature/History/hooks/useHistorySectionsData";
import type { Meal } from "@/types/meal";

const mockGetMealsPageLocalFiltered = jest.fn();
const mockGetMealByCloudIdLocal = jest.fn();
const mockPullChanges = jest.fn();
const mockOn = jest.fn();
const mockResolveDataViewState = jest.fn();
const mockBuildSectionsMap = jest.fn();
const mockFilterSectionsByQuery = jest.fn();

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
  resolveDataViewState: (params: unknown) => mockResolveDataViewState(params),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  getMealsPageLocalFiltered: (...args: unknown[]) =>
    mockGetMealsPageLocalFiltered(...args),
  getMealByCloudIdLocal: (...args: unknown[]) => mockGetMealByCloudIdLocal(...args),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pullChanges: (...args: unknown[]) => mockPullChanges(...args),
}));

jest.mock("@/services/core/events", () => ({
  on: (...args: unknown[]) => mockOn(...args),
}));

jest.mock("@/feature/History/services/historySectionsService", () => ({
  buildSectionsMap: (...args: unknown[]) => mockBuildSectionsMap(...args),
  filterSectionsByQuery: (...args: unknown[]) => mockFilterSectionsByQuery(...args),
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
      const sections = items.map((item) => ({
        key: item.cloudId || item.mealId,
        title: item.name,
        data: [item],
      }));
      return new Map(sections.map((section) => [section.key, section]));
    });
    mockFilterSectionsByQuery.mockImplementation(
      ({ sectionsMap }: { sectionsMap: Map<string, unknown> }) =>
        Array.from(sectionsMap.values()),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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
        items: [buildMeal({ mealId: "meal-2", name: "Fresh filter result" })],
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
});
