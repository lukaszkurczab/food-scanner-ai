import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useHistorySectionsData } from "@/feature/History/hooks/useHistorySectionsData";

const mockGetMealsPageLocalFiltered = jest.fn();
const mockGetMealByCloudIdLocal = jest.fn();
const mockPullChanges = jest.fn();
const mockOn = jest.fn();
const mockResolveDataViewState = jest.fn();

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
  buildSectionsMap: () => new Map(),
  filterSectionsByQuery: ({ sectionsMap }: { sectionsMap: Map<string, unknown> }) =>
    Array.from(sectionsMap.values()),
  addOrUpdateMealInSections: jest.fn(),
  removeMealFromSections: jest.fn(),
}));

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
});
