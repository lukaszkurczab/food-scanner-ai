import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useSavedMealsData } from "@/feature/History/hooks/useSavedMealsData";
import type { SavedMealsPage } from "@/feature/History/services/savedMealsService";
import type { DataViewState } from "@/types/dataViewState";

const mockSubscribeSavedMealsFirstPage = jest.fn<
  (params: {
    uid: string;
    pageSize: number;
    onData: (page: SavedMealsPage) => void | Promise<void>;
    onError: () => void;
  }) => () => void
>();
const mockFetchSavedMealsPage = jest.fn<
  (params: {
    uid: string;
    pageSize: number;
    lastDoc: Exclude<SavedMealsPage["lastDoc"], null>;
  }) => Promise<SavedMealsPage>
>();
const mockDeleteSavedMeal = jest.fn<
  (params: {
    uid: string;
    cloudId: string;
    isOnline: boolean;
    nowISO?: string;
  }) => Promise<"deleted" | "queued">
>();
const mockResolveDataViewState = jest.fn<
  (params: {
    isLoading: boolean;
    hasData: boolean;
    isOnline: boolean;
    hasError: boolean;
  }) => DataViewState
>();

let emitFirstPage: ((page: SavedMealsPage) => void | Promise<void>) | null = null;

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

jest.mock("@/feature/History/services/savedMealsService", () => ({
  subscribeSavedMealsFirstPage: (params: {
    uid: string;
    pageSize: number;
    onData: (page: SavedMealsPage) => void | Promise<void>;
    onError: () => void;
  }) => {
    mockSubscribeSavedMealsFirstPage(params);
    emitFirstPage = params.onData;
    return jest.fn();
  },
  fetchSavedMealsPage: (params: {
    uid: string;
    pageSize: number;
    lastDoc: Exclude<SavedMealsPage["lastDoc"], null>;
  }) => mockFetchSavedMealsPage(params),
  deleteSavedMeal: (params: {
    uid: string;
    cloudId: string;
    isOnline: boolean;
    nowISO?: string;
  }) => mockDeleteSavedMeal(params),
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
    const syncSavedMeals = jest.fn<() => Promise<void>>(async () => undefined);

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
    const syncSavedMeals = jest.fn<() => Promise<void>>(async () => undefined);

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

  it("tracks explicit refresh separately from initial loading", async () => {
    let resolveSync: (() => void) | undefined;
    const syncSavedMeals = jest
      .fn<() => Promise<void>>(async () => undefined)
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSync = () => resolve();
          }),
      );

    const { result } = renderHook(() =>
      useSavedMealsData({
        uid: "user-1",
        query: "",
        filters: null,
        isOnline: true,
        syncSavedMeals,
      }),
    );

    await act(async () => {
      await emitFirstPage?.({ items: [], lastDoc: null, hasMore: false });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let pendingRefresh: Promise<void>;
    await act(async () => {
      pendingRefresh = result.current.refresh();
    });
    await waitFor(() => {
      expect(result.current.refreshing).toBe(true);
    });

    resolveSync?.();
    await act(async () => {
      await pendingRefresh;
    });
    await waitFor(() => {
      expect(result.current.refreshing).toBe(false);
    });
  });
});
