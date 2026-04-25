import { act, renderHook, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BackHandler, type NativeEventSubscription } from "react-native";
import { useMealDetailsState } from "@/feature/History/hooks/useMealDetailsState";
import type { Meal } from "@/types/meal";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";

const mockBackHandlerAddEventListener = jest.fn(
  (_eventName: string, _handler: () => boolean) =>
    ({ remove: jest.fn() }) as NativeEventSubscription,
);
const mockEmit = jest.fn();
const mockOn = jest.fn((_event: string, _handler: (payload?: unknown) => void) =>
  jest.fn(),
);
const mockSelectLocalMealByCloudId = jest.fn(
  (_uid: string, _cloudId: string): Meal | null => null,
);
const mockSubscribeLocalMeals = jest.fn(
  (_uid: string, _listener: () => void) => jest.fn(),
);
const mockGetMyMealByCloudIdLocal = jest.fn(
  async (_uid: string, _cloudId: string): Promise<Meal | null> => null,
);

jest.mock("@/services/core/events", () => ({
  emit: (event: string, payload: unknown) => mockEmit(event, payload),
  on: (event: string, handler: (payload?: unknown) => void) =>
    mockOn(event, handler),
}));

jest.mock("@/services/meals/localMealsStore", () => ({
  selectLocalMealByCloudId: (uid: string, cloudId: string) =>
    mockSelectLocalMealByCloudId(uid, cloudId),
  subscribeLocalMeals: (uid: string, listener: () => void) =>
    mockSubscribeLocalMeals(uid, listener),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  getMyMealByCloudIdLocal: (uid: string, cloudId: string) =>
    mockGetMyMealByCloudIdLocal(uid, cloudId),
}));

const baseMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  cloudId: "meal-1",
  timestamp: "2026-04-12T10:00:00.000Z",
  type: "lunch",
  name: "Chicken bowl",
  ingredients: [],
  createdAt: "2026-04-12T10:00:00.000Z",
  updatedAt: "2026-04-12T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  photoUrl: null,
  photoLocalPath: null,
  localPhotoUrl: null,
  ...overrides,
});

function createNavigation(options?: { canGoBack?: boolean }) {
  const canGoBack = options?.canGoBack ?? true;
  return {
    canGoBack: jest.fn(() => canGoBack),
    goBack: jest.fn(),
    navigate: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  } as unknown as StackNavigationProp<RootStackParamList>;
}

function setupHook(options?: {
  routeMeal?: Meal;
  navigation?: StackNavigationProp<RootStackParamList>;
  deleteMeal?: (id: string) => Promise<unknown>;
  deleteSavedMeal?: (id: string) => Promise<unknown>;
}) {
  const navigation = options?.navigation ?? createNavigation();
  const routeMeal = options?.routeMeal ?? baseMeal();
  const deleteMeal =
    options?.deleteMeal ??
    jest.fn<(id: string) => Promise<unknown>>(async () => undefined);
  const deleteSavedMeal =
    options?.deleteSavedMeal ??
    jest.fn<(id: string) => Promise<unknown>>(async () => undefined);

  const hook = renderHook(() =>
    useMealDetailsState({
      routeParams: { meal: routeMeal },
      navigation,
      uid: "user-1",
      saveDraft: jest.fn(async () => undefined),
      setLastScreen: jest.fn(async () => undefined),
      setMeal: jest.fn(),
      deleteMeal,
      deleteSavedMeal,
    }),
  );

  return {
    ...hook,
    navigation,
    deleteMeal,
    deleteSavedMeal,
  };
}

describe("useMealDetailsState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation(
        ((eventName: string, handler: () => boolean) =>
          mockBackHandlerAddEventListener(eventName, handler)) as typeof BackHandler.addEventListener,
      );
    mockOn.mockReturnValue(jest.fn());
    mockSelectLocalMealByCloudId.mockReturnValue(null);
    mockSubscribeLocalMeals.mockReturnValue(jest.fn());
    mockGetMyMealByCloudIdLocal.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens and closes the delete modal", async () => {
    const { result } = setupHook();

    expect(result.current.showDeleteModal).toBe(false);

    await act(async () => {
      result.current.openDeleteModal();
    });

    expect(result.current.showDeleteModal).toBe(true);

    await act(async () => {
      result.current.closeDeleteModal();
    });

    expect(result.current.showDeleteModal).toBe(false);
  });

  it("deletes through the saved-meal path when the meal exists in my_meals", async () => {
    const savedMeal = baseMeal({ cloudId: "saved-cloud", mealId: "saved-cloud", source: "saved" });
    mockGetMyMealByCloudIdLocal.mockResolvedValue(savedMeal);

    const { result, deleteMeal, deleteSavedMeal, navigation } = setupHook({
      routeMeal: baseMeal({ cloudId: "route-id", mealId: "route-id", source: "saved" }),
    });

    await act(async () => {
      result.current.openDeleteModal();
      await result.current.confirmDelete();
    });

    expect(deleteSavedMeal).toHaveBeenCalledWith("saved-cloud");
    expect(deleteMeal).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.draft).toBeNull();
  });

  it("deletes through the history path when a history meal exists even if source is saved", async () => {
    const historyMeal = baseMeal({ cloudId: "history-cloud", source: "saved" });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);

    const { result, deleteMeal, deleteSavedMeal } = setupHook({
      routeMeal: baseMeal({ cloudId: "route-id", mealId: "route-id", source: "saved" }),
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(deleteMeal).toHaveBeenCalledWith("history-cloud");
    expect(deleteSavedMeal).not.toHaveBeenCalled();
  });

  it("navigates to HistoryList when delete succeeds and there is no back stack", async () => {
    const historyMeal = baseMeal({ cloudId: "history-no-back" });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);

    const navigation = createNavigation({ canGoBack: false });
    const { result } = setupHook({ navigation });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("HistoryList");
  });

  it("navigates to SavedMeals when saved delete succeeds and there is no back stack", async () => {
    const savedMeal = baseMeal({ cloudId: "saved-no-back", source: "saved" });
    mockGetMyMealByCloudIdLocal.mockResolvedValue(savedMeal);

    const navigation = createNavigation({ canGoBack: false });
    const { result } = setupHook({
      navigation,
      routeMeal: baseMeal({ cloudId: "saved-no-back", source: "saved" }),
    });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("SavedMeals");
  });

  it("keeps modal open and does not navigate when delete fails", async () => {
    const historyMeal = baseMeal({ cloudId: "fail-id" });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);

    const deleteError = new Error("failed");
    const deleteMeal = jest.fn<(id: string) => Promise<unknown>>(async () => {
      throw deleteError;
    });

    const navigation = createNavigation();
    const { result } = setupHook({ navigation, deleteMeal });

    await act(async () => {
      result.current.openDeleteModal();
      await result.current.confirmDelete();
    });

    await waitFor(() => {
      expect(result.current.deleting).toBe(false);
    });

    expect(result.current.showDeleteModal).toBe(true);
    expect(result.current.draft).not.toBeNull();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith("ui:toast", {
      key: "unknownError",
      ns: "common",
    });
  });
});
