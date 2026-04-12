import { renderHook, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useSavedMealsData } from "@/feature/History/hooks/useSavedMealsData";
import type { Meal } from "@/types/meal";

const mockSubscribeSavedMealsFirstPage = jest.fn();
const mockFetchSavedMealsPage = jest.fn();
const mockDeleteSavedMeal = jest.fn();
const mockResolveDataViewState = jest.fn();

let emitFirstPage:
  | ((page: { items: Meal[]; lastDoc: string | null; hasMore: boolean }) => void)
  | null = null;

jest.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

jest.mock("@/types/dataViewState", () => ({
  resolveDataViewState: (params: unknown) => mockResolveDataViewState(params),
}));

jest.mock("@/feature/History/services/savedMealsService", () => ({
  subscribeSavedMealsFirstPage: (params: {
    onData: (page: { items: Meal[]; lastDoc: string | null; hasMore: boolean }) => void;
  }) => {
    mockSubscribeSavedMealsFirstPage(params);
    emitFirstPage = params.onData;
    return jest.fn();
  },
  fetchSavedMealsPage: (params: unknown) => mockFetchSavedMealsPage(params),
  deleteSavedMeal: (params: unknown) => mockDeleteSavedMeal(params),
}));

describe("useSavedMealsData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    emitFirstPage = null;
    mockFetchSavedMealsPage.mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    mockDeleteSavedMeal.mockResolvedValue("deleted");
    mockResolveDataViewState.mockReturnValue("ready");
  });

  it("starts a background sync on mount when online", async () => {
    const syncSavedMeals = jest.fn(async () => undefined);

    renderHook(() =>
      useSavedMealsData({
        uid: "user-1",
        query: "",
        filters: null,
        isOnline: true,
        syncSavedMeals,
      }),
    );

    await waitFor(() => {
      expect(syncSavedMeals).toHaveBeenCalledTimes(1);
    });
  });

  it("does not start background sync on mount when offline", async () => {
    const syncSavedMeals = jest.fn(async () => undefined);

    renderHook(() =>
      useSavedMealsData({
        uid: "user-1",
        query: "",
        filters: null,
        isOnline: false,
        syncSavedMeals,
      }),
    );

    await Promise.resolve();
    expect(syncSavedMeals).not.toHaveBeenCalled();
  });
});
