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
  routeParams?: RootStackParamList["MealDetails"];
  navigation?: StackNavigationProp<RootStackParamList>;
  deleteMeal?: (id: string) => Promise<unknown>;
}) {
  const navigation = options?.navigation ?? createNavigation();
  const routeMeal = options?.routeMeal ?? baseMeal();
  const routeParams = options?.routeParams ?? {
    cloudId: routeMeal.cloudId || "",
    initialMeal: routeMeal,
  };
  const deleteMeal =
    options?.deleteMeal ??
    jest.fn<(id: string) => Promise<unknown>>(async () => undefined);

  const hook = renderHook(() =>
    useMealDetailsState({
      routeParams,
      navigation,
      uid: "user-1",
      saveDraft: jest.fn(async () => undefined),
      setLastScreen: jest.fn(async () => undefined),
      setMeal: jest.fn(),
      deleteMeal,
    }),
  );

  return {
    ...hook,
    navigation,
    deleteMeal,
  };
}

describe("useMealDetailsState", () => {
  let localMealsListener: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    localMealsListener = null;
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation(
        ((eventName: string, handler: () => boolean) =>
          mockBackHandlerAddEventListener(eventName, handler)) as typeof BackHandler.addEventListener,
      );
    mockOn.mockReturnValue(jest.fn());
    mockSelectLocalMealByCloudId.mockReturnValue(null);
    mockSubscribeLocalMeals.mockImplementation(
      (_uid: string, listener: () => void) => {
        localMealsListener = listener;
        return jest.fn();
      },
    );
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

  it("renders the updated local meal over a stale initial route snapshot", async () => {
    const historyMeal = baseMeal({
      cloudId: "shared-id",
      mealId: "shared-id",
      name: "Updated history meal",
      source: "manual",
      updatedAt: "2026-04-12T10:00:00.000Z",
    });
    const savedMeal = baseMeal({
      cloudId: "shared-id",
      mealId: "shared-id",
      name: "Saved template",
      source: "saved",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);
    mockGetMyMealByCloudIdLocal.mockResolvedValue(savedMeal);

    const { result } = setupHook({
      routeMeal: baseMeal({
        cloudId: "shared-id",
        mealId: "shared-id",
        name: "Route meal",
      }),
    });

    await waitFor(() => {
      expect(result.current.draft?.name).toBe("Updated history meal");
    });

    expect(mockSelectLocalMealByCloudId).toHaveBeenCalledWith(
      "user-1",
      "shared-id",
    );
    expect(mockGetMyMealByCloudIdLocal).not.toHaveBeenCalled();
  });

  it("falls back safely when route params are missing cloudId", async () => {
    const { result } = setupHook({
      routeParams: {
        initialMeal: baseMeal({ name: "Stale route-only meal" }),
      } as unknown as RootStackParamList["MealDetails"],
    });

    expect(result.current.draft).toBeNull();
    expect(result.current.nutrition).toBeNull();
    expect(mockSelectLocalMealByCloudId).not.toHaveBeenCalled();
    expect(mockSubscribeLocalMeals).not.toHaveBeenCalled();
  });

  it("deletes through deleteMeal and never deletes a saved meal template", async () => {
    const historyMeal = baseMeal({ cloudId: "history-cloud", source: "saved" });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);
    mockGetMyMealByCloudIdLocal.mockResolvedValue(
      baseMeal({ cloudId: "saved-cloud", source: "saved" }),
    );
    const deleteSavedMeal = jest.fn<(id: string) => Promise<unknown>>(
      async () => undefined,
    );

    const { result, deleteMeal } = setupHook({
      routeMeal: baseMeal({
        cloudId: "history-cloud",
        mealId: "history-cloud",
        source: "saved",
      }),
    });

    await act(async () => {
      result.current.openDeleteModal();
      await result.current.confirmDelete();
    });

    expect(deleteMeal).toHaveBeenCalledWith("history-cloud");
    expect(deleteSavedMeal).not.toHaveBeenCalled();
    expect(mockGetMyMealByCloudIdLocal).not.toHaveBeenCalled();
    expect(result.current.showDeleteModal).toBe(false);
    expect(result.current.draft).toBeNull();
  });

  it("clears details and navigates to HistoryList when delete succeeds with no back stack", async () => {
    const historyMeal = baseMeal({ cloudId: "history-no-back" });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);

    const navigation = createNavigation({ canGoBack: false });
    const { result } = setupHook({ navigation });

    await act(async () => {
      await result.current.confirmDelete();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("HistoryList");
    expect(result.current.draft).toBeNull();
  });

  it("falls back to HistoryList when backing without a stack", async () => {
    const navigation = createNavigation({ canGoBack: false });
    const { result } = setupHook({ navigation });

    await act(async () => {
      result.current.handleBack();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("HistoryList");
  });

  it("shows unavailable details after the local history meal is deleted", async () => {
    const historyMeal = baseMeal({ cloudId: "local-delete" });
    mockSelectLocalMealByCloudId.mockReturnValue(historyMeal);

    const { result } = setupHook({
      routeMeal: baseMeal({ cloudId: "local-delete", mealId: "local-delete" }),
    });

    await waitFor(() => {
      expect(result.current.draft?.cloudId).toBe("local-delete");
    });

    mockSelectLocalMealByCloudId.mockReturnValue(null);

    await act(async () => {
      localMealsListener?.();
    });

    await waitFor(() => {
      expect(result.current.draft).toBeNull();
      expect(result.current.nutrition).toBeNull();
    });
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
