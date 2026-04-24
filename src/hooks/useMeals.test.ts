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
import { useMeals } from "@/hooks/useMeals";

const mockUuid = jest.fn<() => string>();
const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetMealsPageLocal = jest.fn<
  (uid: string, limit: number, before?: string) => Promise<Meal[]>
>();
const mockGetMealByCloudIdLocal = jest.fn<
  (uid: string, cloudId: string) => Promise<Meal | null>
>();
const mockUpsertMealLocal = jest.fn<(meal: Meal) => Promise<void>>();
const mockUpsertMyMealLocal = jest.fn<(meal: Meal) => Promise<void>>();
const mockMarkDeletedLocal = jest.fn<(cloudId: string, now: string) => Promise<void>>();
const mockEnqueueUpsert = jest.fn<(uid: string, meal: Meal) => Promise<void>>();
const mockEnqueueDelete = jest.fn<
  (uid: string, cloudId: string, now: string) => Promise<void>
>();
const mockEnqueueMyMealUpsert = jest.fn<(uid: string, meal: Meal) => Promise<void>>();
const mockInsertOrUpdateImage = jest.fn<
  (uid: string, cloudId: string, path: string, status: "pending") => Promise<void>
>();
const mockReconcileAll = jest.fn<(uid: string) => Promise<void>>();
const mockRefreshStreakFromBackend = jest.fn<
  (uid: string, options?: { refreshBadges?: boolean }) => Promise<void>
>();
const mockEmit = jest.fn<(event: string, payload: Record<string, unknown>) => void>();
const mockOn = jest.fn();
const mockPushQueue = jest.fn<(uid: string) => Promise<void>>();
const mockPullChanges = jest.fn<(uid: string) => Promise<void>>();
const mockUpsertMyMealWithPhoto = jest.fn<
  (uid: string, meal: Meal, localPhoto: string | null) => Promise<void>
>();
const mockDebugLog = jest.fn();
const mockDebugWarn = jest.fn();
const mockTrackMealLogged = jest.fn<(meal: Meal) => Promise<void>>();
const mockEventHandlers = new Map<
  string,
  Set<(payload?: Record<string, unknown>) => void>
>();

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("@/services/offline/meals.repo", () => ({
  getMealsPageLocal: (uid: string, limit: number, before?: string) =>
    mockGetMealsPageLocal(uid, limit, before),
  getMealByCloudIdLocal: (uid: string, cloudId: string) =>
    mockGetMealByCloudIdLocal(uid, cloudId),
  upsertMealLocal: (meal: Meal) => mockUpsertMealLocal(meal),
  markDeletedLocal: (cloudId: string, now: string) =>
    mockMarkDeletedLocal(cloudId, now),
  getPendingMealsLocal: () => Promise.resolve([]),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  upsertMyMealLocal: (meal: Meal) => mockUpsertMyMealLocal(meal),
}));

jest.mock("@/services/offline/queue.repo", () => ({
  enqueueUpsert: (uid: string, meal: Meal) => mockEnqueueUpsert(uid, meal),
  enqueueDelete: (uid: string, cloudId: string, now: string) =>
    mockEnqueueDelete(uid, cloudId, now),
  enqueueMyMealUpsert: (uid: string, meal: Meal) =>
    mockEnqueueMyMealUpsert(uid, meal),
}));

jest.mock("@/services/offline/images.repo", () => ({
  insertOrUpdateImage: (
    uid: string,
    cloudId: string,
    path: string,
    status: "pending",
  ) => mockInsertOrUpdateImage(uid, cloudId, path, status),
}));

jest.mock("@/services/notifications/engine", () => ({
  reconcileAll: (uid: string) => mockReconcileAll(uid),
}));

jest.mock("@/services/gamification/streakService", () => ({
  refreshStreakFromBackend: (
    uid: string,
    options?: { refreshBadges?: boolean },
  ) => mockRefreshStreakFromBackend(uid, options),
}));

jest.mock("@/services/core/events", () => ({
  emit: (event: string, payload: Record<string, unknown>) => {
    mockEmit(event, payload);
    const handlers = mockEventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(payload);
      }
    }
  },
  on: (event: string, handler: (payload?: Record<string, unknown>) => void) => {
    mockOn(event, handler);
    const handlers = mockEventHandlers.get(event) ?? new Set();
    handlers.add(handler);
    mockEventHandlers.set(event, handlers);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        mockEventHandlers.delete(event);
      }
    };
  },
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pushQueue: (uid: string) => mockPushQueue(uid),
  pullChanges: (uid: string) => mockPullChanges(uid),
}));

jest.mock("@/services/meals/myMealService", () => ({
  upsertMyMealWithPhoto: (uid: string, meal: Meal, localPhoto: string | null) =>
    mockUpsertMyMealWithPhoto(uid, meal, localPhoto),
}));

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackMealLogged: (meal: Meal) => mockTrackMealLogged(meal),
}));

jest.mock("@/utils/debug", () => ({
  debugScope: () => ({
    log: (...args: unknown[]) => mockDebugLog(...args),
    warn: (...args: unknown[]) => mockDebugWarn(...args),
    error: () => undefined,
    time: () => undefined,
    timeEnd: () => undefined,
    child: () => ({
      log: (...args: unknown[]) => mockDebugLog(...args),
      warn: (...args: unknown[]) => mockDebugWarn(...args),
      error: () => undefined,
      time: () => undefined,
      timeEnd: () => undefined,
      child: () => ({
        log: (...nestedArgs: unknown[]) => mockDebugLog(...nestedArgs),
        warn: (...nestedArgs: unknown[]) => mockDebugWarn(...nestedArgs),
        error: () => undefined,
        time: () => undefined,
        timeEnd: () => undefined,
        child: () => {
          throw new Error("child() depth exceeded in test mock");
        },
      }),
    }),
  }),
}));

const baseMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-02-25T10:00:00.000Z",
  type: "lunch",
  name: "Chicken",
  ingredients: [
    { id: "i1", name: "A", amount: 100, kcal: 100, protein: 10, fat: 2, carbs: 5 },
    { id: "i2", name: "B", amount: 50, kcal: 50, protein: 5, fat: 1, carbs: 3 },
  ],
  createdAt: "2026-02-25T10:00:00.000Z",
  updatedAt: "2026-02-25T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  cloudId: "cloud-1",
  totals: { kcal: 150, protein: 15, fat: 3, carbs: 8 },
  ...overrides,
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const baseAddMealInput: Omit<Meal, "updatedAt" | "deleted"> = {
  userUid: "user-1",
  mealId: "meal-add",
  timestamp: "2026-01-01T00:00:00.000Z",
  type: "lunch",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  syncState: "synced",
  source: "manual",
};

describe("useMeals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockEventHandlers.clear();

    mockUuid.mockImplementation(() => `uuid-${mockUuid.mock.calls.length}`);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetMealsPageLocal.mockResolvedValue([]);
    mockGetMealByCloudIdLocal.mockResolvedValue(null);
    mockUpsertMealLocal.mockResolvedValue();
    mockUpsertMyMealLocal.mockResolvedValue();
    mockMarkDeletedLocal.mockResolvedValue();
    mockEnqueueUpsert.mockResolvedValue();
    mockEnqueueDelete.mockResolvedValue();
    mockEnqueueMyMealUpsert.mockResolvedValue();
    mockInsertOrUpdateImage.mockResolvedValue();
    mockReconcileAll.mockResolvedValue();
    mockRefreshStreakFromBackend.mockResolvedValue();
    mockPushQueue.mockResolvedValue();
    mockPullChanges.mockResolvedValue();
    mockUpsertMyMealWithPhoto.mockResolvedValue();
    mockTrackMealLogged.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads first page for a signed-in user", async () => {
    const firstPage = [
      baseMeal({ cloudId: "cloud-2", timestamp: "2026-02-25T12:00:00.000Z" }),
      baseMeal({ cloudId: "cloud-1", timestamp: "2026-02-25T10:00:00.000Z" }),
    ];
    mockGetMealsPageLocal.mockResolvedValueOnce(firstPage);

    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.meals).toEqual(firstPage);
    expect(mockGetMealsPageLocal).toHaveBeenCalledWith("user-1", 50, undefined);
    expect(mockPullChanges).toHaveBeenCalledWith("user-1");
  });

  it("reloads visible meals when a synced meal event arrives", async () => {
    mockGetMealsPageLocal
      .mockResolvedValueOnce([baseMeal({ cloudId: "c1", name: "Old meal" })])
      .mockResolvedValueOnce([baseMeal({ cloudId: "c2", name: "Fresh meal" })]);

    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      const handlers = mockEventHandlers.get("meal:synced");
      handlers?.forEach((handler) => handler({ uid: "user-1" }));
    });

    await waitFor(() => {
      expect(result.current.meals[0]?.cloudId).toBe("c2");
    });
  });

  it("reloads visible meals when another useMeals instance emits meal deleted", async () => {
    mockGetMealsPageLocal
      .mockResolvedValueOnce([baseMeal({ cloudId: "c1", name: "Old meal" })])
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.meals.map((meal) => meal.cloudId)).toEqual(["c1"]);
    });

    act(() => {
      const handlers = mockEventHandlers.get("meal:deleted");
      handlers?.forEach((handler) =>
        handler({ uid: "user-1", cloudId: "c1", sourceHookId: "other-instance" }),
      );
    });

    await waitFor(() => {
      expect(result.current.meals).toEqual([]);
    });
  });

  it("merges local upserts from another useMeals instance without backend reload", async () => {
    const pendingMeal = baseMeal({
      cloudId: "pending-cloud",
      mealId: "pending-meal",
      name: "Pending meal",
      syncState: "pending",
      timestamp: "2026-02-25T13:00:00.000Z",
      updatedAt: "2026-02-25T13:00:00.000Z",
      dayKey: "2026-02-25",
    });

    mockGetMealsPageLocal.mockResolvedValueOnce([
      baseMeal({ cloudId: "existing-cloud", timestamp: "2026-02-25T10:00:00.000Z" }),
    ]);
    mockGetMealByCloudIdLocal.mockResolvedValueOnce(pendingMeal);

    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    mockGetMealsPageLocal.mockClear();
    mockPullChanges.mockClear();

    await act(async () => {
      const handlers = mockEventHandlers.get("meal:local:upserted");
      handlers?.forEach((handler) =>
        handler({
          uid: "user-1",
          cloudId: "pending-cloud",
          dayKey: "2026-02-25",
          ts: "2026-02-25T13:00:00.000Z",
        }),
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.meals[0]).toEqual(
        expect.objectContaining({
          cloudId: "pending-cloud",
          syncState: "pending",
        }),
      );
    });
    expect(mockGetMealByCloudIdLocal).toHaveBeenCalledWith(
      "user-1",
      "pending-cloud",
    );
    expect(mockGetMealsPageLocal).not.toHaveBeenCalled();
    expect(mockPullChanges).not.toHaveBeenCalled();
  });

  it("clears data when user is missing and keeps pagination inactive", async () => {
    const { result } = renderHook(() => useMeals(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.meals).toEqual([]);
    expect(mockGetMealsPageLocal).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.loadNextPage();
      await result.current.getMeals();
    });
    expect(mockGetMealsPageLocal).not.toHaveBeenCalled();
  });

  it("supports paginating meals and stops when no more results exist", async () => {
    const firstPage = [
      baseMeal({ cloudId: "c3", timestamp: "2026-02-25T12:00:00.000Z" }),
      baseMeal({ cloudId: "c2", timestamp: "2026-02-25T10:00:00.000Z" }),
    ];
    const secondPage = [baseMeal({ cloudId: "c1", timestamp: "2026-02-25T08:00:00.000Z" })];

    mockGetMealsPageLocal
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadNextPage();
    });
    expect(result.current.meals.map((m) => m.cloudId)).toEqual(["c3", "c2", "c1"]);
    expect(mockGetMealsPageLocal).toHaveBeenNthCalledWith(2, "user-1", 50, "2026-02-25T10:00:00.000Z");

    await act(async () => {
      await result.current.loadNextPage();
    });

    await act(async () => {
      await result.current.loadNextPage();
    });
    expect(mockGetMealsPageLocal).toHaveBeenCalledTimes(3);
  });

  it("adds a meal, computes totals, updates local feed and queues sync", async () => {
    jest.useFakeTimers();
    mockGetMealsPageLocal.mockResolvedValue([]);
    mockUuid.mockReturnValueOnce("cloud-new").mockReturnValueOnce("meal-new");

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMeal(
        {
          userUid: "ignored",
          mealId: undefined as unknown as string,
          timestamp: undefined as unknown as string,
          type: "dinner",
          name: "New meal",
          ingredients: [
            { id: "1", name: "A", amount: 1, kcal: 20, protein: 2, fat: 1, carbs: 3 },
            { id: "2", name: "B", amount: 1, kcal: 30, protein: 4, fat: 2, carbs: 5 },
          ],
          createdAt: undefined as unknown as string,
          syncState: "synced",
          source: null,
          cloudId: undefined,
          photoUrl: "file://local-photo.jpg",
          aiMeta: {
            model: "gpt-5.4-mini",
            runId: "run-1",
            confidence: 0.9,
            warnings: ["partial_totals"],
          },
        },
      );
    });

    expect(mockInsertOrUpdateImage).toHaveBeenCalledWith(
      "user-1",
      "cloud-new",
      "file://local-photo.jpg",
      "pending",
    );
    expect(mockUpsertMealLocal).toHaveBeenCalledTimes(1);
    const savedPayload = mockUpsertMealLocal.mock.calls[0][0];
    expect(savedPayload.cloudId).toBe("cloud-new");
    expect(savedPayload.mealId).toBe("meal-new");
    expect(savedPayload.source).toBe("manual");
    expect(savedPayload.inputMethod).toBe("manual");
    expect(savedPayload.dayKey).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(savedPayload.aiMeta).toEqual({
      model: "gpt-5.4-mini",
      runId: "run-1",
      confidence: 0.9,
      warnings: ["partial_totals"],
    });
    expect(savedPayload.totals).toEqual({ kcal: 50, protein: 6, fat: 3, carbs: 8 });
    expect(mockEnqueueUpsert).toHaveBeenCalledWith("user-1", savedPayload);
    expect(mockTrackMealLogged).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "cloud-new",
        mealId: "meal-new",
        source: "manual",
      }),
    );
    expect(result.current.meals[0]).toEqual(
      expect.objectContaining({
        cloudId: "cloud-new",
        mealId: "meal-new",
        name: "New meal",
      }),
    );
    expect(mockEmit).toHaveBeenCalledWith("meal:added", expect.any(Object));
    expect(mockEmit).toHaveBeenCalledWith("ui:toast", {
      key: "toast.mealAdded",
      ns: "common",
    });

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    await flush();

    expect(mockPushQueue).toHaveBeenCalledWith("user-1");
    expect(mockPullChanges).toHaveBeenCalledWith("user-1");
    expect(mockRefreshStreakFromBackend).toHaveBeenCalledWith("user-1", {
      refreshBadges: true,
    });
    expect(mockReconcileAll).toHaveBeenCalledWith("user-1");
  });

  it("does nothing on add when user is missing", async () => {
    const { result } = renderHook(() => useMeals(null));

    await act(async () => {
      await result.current.addMeal({
        userUid: "",
        mealId: "m",
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "lunch",
        name: "Meal",
        ingredients: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        syncState: "synced",
        source: "manual",
      });
    });

    expect(mockUpsertMealLocal).not.toHaveBeenCalled();
  });

  it("logs from saved template without updating my meals template by default", async () => {
    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMeal({
        userUid: "user-1",
        mealId: "draft-meal-id",
        savedMealRefId: "saved-template-1",
        timestamp: "2026-03-15T12:00:00.000Z",
        type: "lunch",
        name: "Saved draft",
        ingredients: [],
        createdAt: "2026-03-15T12:00:00.000Z",
        syncState: "synced",
        source: "saved",
      });
    });

    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: "draft-meal-id",
        cloudId: expect.any(String),
        source: "saved",
      }),
    );
    expect(mockUpsertMyMealWithPhoto).not.toHaveBeenCalled();
    expect(result.current.meals[0]).toEqual(
      expect.objectContaining({
        mealId: "draft-meal-id",
        source: "saved",
      }),
    );
  });

  it("updates an existing saved template by id without creating a duplicate", async () => {
    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateSavedMealTemplate(
        "saved-template-42",
        baseMeal({
          mealId: "logged-meal-1",
          cloudId: "logged-meal-1",
          source: "saved",
          savedMealRefId: "saved-template-42",
          photoUrl: "file://template-update.jpg",
        }),
      );
    });

    expect(mockUpsertMyMealWithPhoto).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        mealId: "saved-template-42",
        cloudId: "saved-template-42",
        source: "saved",
      }),
      "file://template-update.jpg",
    );
    expect(mockUpsertMealLocal).not.toHaveBeenCalled();
    expect(mockEnqueueUpsert).not.toHaveBeenCalled();
  });

  it("shows offline queued toast once while timer is already scheduled", async () => {
    jest.useFakeTimers();
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(9_000);
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const addInput = {
      userUid: "user-1",
      mealId: "m1",
      timestamp: "2026-01-01T00:00:00.000Z",
      type: "lunch" as const,
      name: "Meal",
      ingredients: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      syncState: "synced" as const,
      source: "manual" as const,
    };

    await act(async () => {
      await result.current.addMeal(addInput);
      await result.current.addMeal(addInput);
    });
    await flush();

    const offlineToasts = mockEmit.mock.calls.filter(
      ([event, payload]) =>
        event === "ui:toast" &&
        (payload as { key?: string }).key === "toast.savedLocallySyncLater",
    );
    expect(offlineToasts).toHaveLength(1);
    expect(mockDebugLog).toHaveBeenCalledWith("sync already scheduled", {
      uid: "user-1",
      reason: "add",
    });

    nowSpy.mockRestore();
  });

  it("updates saved meals via myMeal service", async () => {
    mockUuid.mockReturnValueOnce("saved-doc");
    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateMeal(
        baseMeal({
          mealId: "",
          cloudId: undefined,
          source: "saved",
          photoUrl: "file://saved-photo.jpg",
        }),
      );
    });

    expect(mockUpsertMyMealWithPhoto).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        mealId: "saved-doc",
        cloudId: "saved-doc",
      }),
      "file://saved-photo.jpg",
    );
    expect(mockTrackMealLogged).not.toHaveBeenCalled();
    expect(mockUpsertMealLocal).not.toHaveBeenCalled();
    expect(mockEnqueueUpsert).not.toHaveBeenCalled();
    expect(mockReconcileAll).not.toHaveBeenCalled();
  });

  it("updates regular meals and handles local image upload metadata", async () => {
    jest.useFakeTimers();
    mockUuid.mockReturnValueOnce("updated-cloud");

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateMeal(
        baseMeal({
          cloudId: undefined,
          timestamp: undefined as unknown as string,
          source: "manual",
          photoUrl: "content://updated-photo.jpg",
        }),
      );
    });

    expect(mockInsertOrUpdateImage).toHaveBeenCalledWith(
      "user-1",
      "updated-cloud",
      "content://updated-photo.jpg",
      "pending",
    );
    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "updated-cloud",
        photoLocalPath: "content://updated-photo.jpg",
      }),
    );
    expect(mockEnqueueUpsert).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        cloudId: "updated-cloud",
      }),
    );
    expect(mockTrackMealLogged).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    await flush();

    expect(mockPushQueue).toHaveBeenCalledWith("user-1");
    expect(mockPullChanges).toHaveBeenCalledWith("user-1");
    expect(mockRefreshStreakFromBackend).toHaveBeenCalledWith("user-1", {
      refreshBadges: true,
    });
    expect(mockReconcileAll).toHaveBeenCalledWith("user-1");
  });

  it("deletes meals, prunes local list and queues delete sync", async () => {
    jest.useFakeTimers();
    mockGetMealsPageLocal.mockResolvedValueOnce([
      baseMeal({ cloudId: "delete-me" }),
      baseMeal({ cloudId: "keep-me" }),
      baseMeal({ cloudId: undefined }),
    ]);

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.meals).toHaveLength(3);
    });

    await act(async () => {
      await result.current.deleteMeal("");
    });
    expect(mockMarkDeletedLocal).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.deleteMeal("delete-me");
    });

    expect(mockMarkDeletedLocal).toHaveBeenCalledTimes(1);
    expect(mockEnqueueDelete).toHaveBeenCalledWith(
      "user-1",
      "delete-me",
      expect.any(String),
    );
    expect(result.current.meals.map((m) => m.cloudId)).toEqual(["keep-me", undefined]);
    expect(mockEmit).toHaveBeenCalledWith(
      "meal:deleted",
      expect.objectContaining({
        uid: "user-1",
        cloudId: "delete-me",
      }),
    );
    expect(mockTrackMealLogged).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    await flush();
    expect(mockPushQueue).toHaveBeenCalledWith("user-1");
    expect(mockPullChanges).toHaveBeenCalledWith("user-1");
    expect(mockRefreshStreakFromBackend).toHaveBeenCalledWith("user-1", {
      refreshBadges: true,
    });
    expect(mockReconcileAll).toHaveBeenCalledWith("user-1");
  });

  it("duplicates meals and allows overriding target date", async () => {
    jest.useFakeTimers();
    mockUuid.mockReturnValueOnce("copy-cloud").mockReturnValueOnce("copy-meal");

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.duplicateMeal(
        baseMeal({ cloudId: "origin-cloud", mealId: "origin-meal" }),
        "2026-03-01T12:00:00.000Z",
      );
    });

    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "copy-cloud",
        mealId: "copy-meal",
        timestamp: "2026-03-01T12:00:00.000Z",
        deleted: false,
      }),
    );
    expect(mockEnqueueUpsert).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ cloudId: "copy-cloud" }),
    );
    expect(mockTrackMealLogged).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "copy-cloud",
        mealId: "copy-meal",
      }),
    );
    expect(mockEmit).toHaveBeenCalledWith("ui:toast", {
      key: "toast.mealAdded",
      ns: "common",
    });
  });

  it("duplicates meals without date override and uses current timestamp", async () => {
    jest.useFakeTimers();
    mockUuid.mockReturnValueOnce("copy-no-date-cloud").mockReturnValueOnce("copy-no-date-meal");

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.duplicateMeal(
        baseMeal({ cloudId: "origin-cloud-2", mealId: "origin-meal-2" }),
      );
    });

    const duplicated = mockUpsertMealLocal.mock.calls[mockUpsertMealLocal.mock.calls.length - 1][0];
    expect(duplicated.timestamp).toBe(duplicated.createdAt);
  });

  it("runs explicit sync, handles sync failures and returns empty unsynced meals list", async () => {
    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockPushQueue.mockRejectedValueOnce(new Error("push failed"));
    await act(async () => {
      await result.current.syncMeals();
    });
    expect(mockDebugWarn).toHaveBeenCalledWith(
      "sync flush failed",
      expect.any(Error),
    );

    await act(async () => {
      await result.current.syncMeals();
    });
    expect(mockPushQueue).toHaveBeenCalledWith("user-1");
    expect(mockPullChanges).toHaveBeenCalledWith("user-1");

    const unsynced = await result.current.getUnsyncedMeals();
    expect(unsynced).toEqual([]);
  });

  it("logs reconcile failures from sync-triggered reconcile", async () => {
    mockReconcileAll.mockRejectedValueOnce(new Error("reconcile failed"));
    const { result } = renderHook(() => useMeals("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.syncMeals();
    });
    await flush();

    expect(mockDebugWarn).toHaveBeenCalledWith(
      "reconcile failed",
      expect.any(Error),
    );
  });

  it("queues a follow-up sync when requested during in-flight sync", async () => {
    jest.useFakeTimers();
    let releaseFirstPush: () => void = () => {};
    const firstPushPromise = new Promise<void>((resolve) => {
      releaseFirstPush = resolve;
    });
    mockPushQueue
      .mockImplementationOnce(() => firstPushPromise)
      .mockResolvedValueOnce();

    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    mockPullChanges.mockClear();

    let firstSyncPromise: Promise<void> | null = null;
    await act(async () => {
      firstSyncPromise = result.current.syncMeals();
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.syncMeals();
    });

    releaseFirstPush();
    await act(async () => {
      await firstSyncPromise;
    });

    expect(mockPushQueue).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    await flush();

    expect(mockPushQueue).toHaveBeenCalledTimes(2);
    expect(mockPullChanges).toHaveBeenCalledTimes(2);
  });

  it("clears pending sync timer when user changes", async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | null }) => useMeals(uid),
      { initialProps: { uid: "user-1" } },
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMeal(baseAddMealInput);
    });

    await act(async () => {
      rerender({ uid: "user-2" });
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it("handles add totals when ingredient nutrients are missing", async () => {
    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMeal({
        ...baseAddMealInput,
        mealId: "missing-nutrients",
        ingredients: [
          {
            id: "broken",
            name: "Broken Ingredient",
            amount: 1,
          } as unknown as Meal["ingredients"][number],
        ],
      });
    });

    const saved = mockUpsertMealLocal.mock.calls[mockUpsertMealLocal.mock.calls.length - 1][0];
    expect(saved.totals).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("handles add totals when ingredients are missing entirely", async () => {
    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addMeal({
        ...baseAddMealInput,
        mealId: "missing-ingredients",
        ingredients: undefined as unknown as Meal["ingredients"],
      });
    });

    const saved = mockUpsertMealLocal.mock.calls[mockUpsertMealLocal.mock.calls.length - 1][0];
    expect(saved.totals).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("updates meal without local image registration for remote urls", async () => {
    const { result } = renderHook(() => useMeals("user-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateMeal(
        baseMeal({
          cloudId: "remote-cloud",
          source: "manual",
          photoUrl: "https://example.com/photo.jpg",
        }),
      );
    });

    expect(mockInsertOrUpdateImage).not.toHaveBeenCalledWith(
      "user-1",
      "remote-cloud",
      expect.anything(),
      "pending",
    );
  });

  it("returns early for operations requiring user when user is missing", async () => {
    const { result } = renderHook(() => useMeals(null));

    await act(async () => {
      await result.current.updateMeal(baseMeal());
      await result.current.duplicateMeal(baseMeal());
      await result.current.syncMeals();
    });

    expect(mockUpsertMyMealWithPhoto).not.toHaveBeenCalled();
    expect(mockUpsertMealLocal).not.toHaveBeenCalled();
    expect(mockPushQueue).not.toHaveBeenCalled();
  });
});
