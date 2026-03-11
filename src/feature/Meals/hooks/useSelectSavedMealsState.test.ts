import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { useSelectSavedMealsState } from "@/feature/Meals/hooks/useSelectSavedMealsState";

const mockUuid = jest.fn<() => string>();
const mockSubscribeToMyMealsOrderedByName = jest.fn();
const mockUnsubscribe = jest.fn();

let emitRepoData: ((items: Meal[]) => void) | null = null;

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@/services/meals/myMealsRepository", () => ({
  subscribeToMyMealsOrderedByName: (params: {
    uid: string;
    onData: (items: Meal[]) => void;
  }) => {
    mockSubscribeToMyMealsOrderedByName(params);
    emitRepoData = params.onData;
    return mockUnsubscribe;
  },
}));

const meal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-02-01T10:00:00.000Z",
  type: "lunch",
  name: "Chicken pasta",
  ingredients: [],
  createdAt: "2026-02-01T10:00:00.000Z",
  updatedAt: "2026-02-01T10:00:00.000Z",
  syncState: "synced",
  source: "saved",
  ...overrides,
});

describe("useSelectSavedMealsState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    emitRepoData = null;
    mockUuid.mockReturnValue("uuid-new");
  });

  it("resets state when uid is missing", async () => {
    const { result } = renderHook(() =>
      useSelectSavedMealsState({
        uid: null,
        syncSavedMeals: jest.fn(async () => undefined),
        draftMeal: null,
        setMeal: jest.fn(),
        saveDraft: jest.fn<
          (uid: string, draftOverride?: Meal | null) => Promise<void>
        >(async () => undefined),
        setLastScreen: jest.fn(async () => undefined),
        onNavigateResult: jest.fn(),
        onStartOver: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pageItems).toEqual([]);
    expect(mockSubscribeToMyMealsOrderedByName).not.toHaveBeenCalled();
  });

  it("hydrates cached items, subscribes to repository data and mirrors cache", async () => {
    const { result, unmount } = renderHook(() =>
      useSelectSavedMealsState({
        uid: "user-1",
        syncSavedMeals: jest.fn(async () => undefined),
        draftMeal: null,
        setMeal: jest.fn(),
        saveDraft: jest.fn<
          (uid: string, draftOverride?: Meal | null) => Promise<void>
        >(async () => undefined),
        setLastScreen: jest.fn(async () => undefined),
        onNavigateResult: jest.fn(),
        onStartOver: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(mockSubscribeToMyMealsOrderedByName).toHaveBeenCalledWith(
        expect.objectContaining({ uid: "user-1" }),
      );
    });

    act(() => {
      emitRepoData?.([
        meal({ mealId: "meal-2", name: "Apple pie" }),
        meal({ mealId: "meal-3", name: "Beef bowl" }),
      ]);
    });

    await waitFor(() => {
      expect(result.current.pageItems.map((item) => item.name)).toEqual([
        "Apple pie",
        "Beef bowl",
      ]);
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("selects a meal and confirms draft navigation flow", async () => {
    const setMeal = jest.fn();
    const saveDraft = jest.fn<
      (uid: string, draftOverride?: Meal | null) => Promise<void>
    >(async () => undefined);
    const setLastScreen = jest.fn<
      (uid: string, screen: string) => Promise<void>
    >(async () => undefined);
    const onNavigateResult = jest.fn();
    const onStartOver = jest.fn();

    const { result } = renderHook(() =>
      useSelectSavedMealsState({
        uid: "user-1",
        syncSavedMeals: jest.fn(async () => undefined),
        draftMeal: null,
        setMeal,
        saveDraft,
        setLastScreen,
        onNavigateResult,
        onStartOver,
      }),
    );

    act(() => {
      emitRepoData?.([meal()]);
    });

    await waitFor(() => {
      expect(result.current.pageItems).toHaveLength(1);
    });

    await act(async () => {
      result.current.handleSelect(result.current.pageItems[0]);
    });
    expect(result.current.selectedId).toBe("meal-1");

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(setMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: "meal-1",
        source: "saved",
        name: "Chicken pasta",
      }),
    );
    expect(saveDraft).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        mealId: "meal-1",
        source: "saved",
      }),
    );
    expect(setLastScreen).toHaveBeenCalledWith("user-1", "Result");
    expect(onNavigateResult).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleStartOver();
    });
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});
