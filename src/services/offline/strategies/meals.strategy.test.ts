import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockFetchMealChangesRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSaveMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMarkMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertMealLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetMealByCloudIdLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSetMealSyncStateLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockEmit = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

jest.mock("@/services/meals/mealsRepository", () => ({
  buildMealUpdatedCursor: (meal: { updatedAt: string; cloudId?: string }) =>
    `${meal.updatedAt}|${meal.cloudId || meal.updatedAt}`,
  fetchMealChangesRemote: (...args: unknown[]) => mockFetchMealChangesRemote(...args),
  markMealDeletedRemote: (...args: unknown[]) => mockMarkMealDeletedRemote(...args),
  saveMealRemote: (...args: unknown[]) => mockSaveMealRemote(...args),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  upsertMealLocal: (...args: unknown[]) => mockUpsertMealLocal(...args),
  getMealByCloudIdLocal: (...args: unknown[]) => mockGetMealByCloudIdLocal(...args),
  setMealSyncStateLocal: (...args: unknown[]) => mockSetMealSyncStateLocal(...args),
}));

jest.mock("@/services/core/events", () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

describe("meals strategy", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
    mockFetchMealChangesRemote
      .mockReset()
      .mockResolvedValue({ items: [], nextCursor: null });
    mockSaveMealRemote.mockResolvedValue();
    mockMarkMealDeletedRemote.mockResolvedValue();
    mockUpsertMealLocal.mockResolvedValue();
    mockGetMealByCloudIdLocal.mockResolvedValue(null);
    mockSetMealSyncStateLocal.mockResolvedValue();
  });

  it("handles meal upsert push ops and marks local record synced", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mealsStrategy } = require("@/services/offline/strategies/meals.strategy");

    const handled = await mealsStrategy.handlePushOp("user-1", {
      id: 2,
      cloud_id: "meal-1",
      user_uid: "user-1",
      kind: "upsert",
      payload: {
        cloudId: "meal-1",
        mealId: "meal-1",
        userUid: "user-1",
        timestamp: "2026-03-03T12:00:00.000Z",
        type: "lunch",
        ingredients: [],
        createdAt: "2026-03-03T12:00:00.000Z",
        updatedAt: "2026-03-03T12:00:00.000Z",
        totals: { kcal: 200, protein: 30, carbs: 0, fat: 5 },
      },
      updated_at: "2026-03-03T12:00:00.000Z",
      attempts: 0,
    });

    expect(handled).toBe(true);
    expect(mockSaveMealRemote).toHaveBeenCalledWith({
      uid: "user-1",
      meal: expect.objectContaining({
        cloudId: "meal-1",
        mealId: "meal-1",
        userUid: "user-1",
        type: "lunch",
      }),
    });
    expect(mockSetMealSyncStateLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        cloudId: "meal-1",
        syncState: "synced",
      }),
    );
  });

  it("pulls meal changes and advances cursor", async () => {
    mockFetchMealChangesRemote
      .mockResolvedValueOnce({
        items: [
          {
            userUid: "user-1",
            mealId: "meal-1",
            cloudId: "meal-1",
            timestamp: "2026-03-03T12:00:00.000Z",
            type: "lunch",
            name: "Chicken",
            ingredients: [],
            createdAt: "2026-03-03T12:00:00.000Z",
            updatedAt: "2026-03-03T12:30:00.000Z",
            syncState: "synced",
            source: "manual",
            imageId: null,
            photoUrl: null,
            notes: null,
            tags: [],
            deleted: false,
            totals: { kcal: 200, protein: 30, carbs: 0, fat: 5 },
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({ items: [], nextCursor: null });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mealsStrategy } = require("@/services/offline/strategies/meals.strategy");

    const synced = await mealsStrategy.pull("user-1");

    expect(synced).toBe(1);
    expect(mockFetchMealChangesRemote).toHaveBeenCalledWith({
      uid: "user-1",
      pageSize: 100,
      cursor: "1970-01-01T00:00:00.000Z",
    });
    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "meal-1",
        updatedAt: "2026-03-03T12:30:00.000Z",
        syncState: "synced",
      }),
    );
    expect(mockEmit).not.toHaveBeenCalledWith(
      "meal:conflict:ambiguous",
      expect.anything(),
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      "sync:last_pull_ts:user-1",
      "2026-03-03T12:30:00.000Z|meal-1",
    );
  });

  it("keeps newer local meal version during pull conflicts", async () => {
    mockFetchMealChangesRemote
      .mockResolvedValueOnce({
        items: [
          {
            userUid: "user-1",
            mealId: "meal-1",
            cloudId: "meal-1",
            timestamp: "2026-03-03T12:00:00.000Z",
            type: "lunch",
            name: "Remote",
            ingredients: [],
            createdAt: "2026-03-03T12:00:00.000Z",
            updatedAt: "2026-03-03T12:10:00.000Z",
            syncState: "synced",
            source: "manual",
            imageId: null,
            photoUrl: null,
            notes: null,
            tags: [],
            deleted: false,
            totals: { kcal: 200, protein: 30, carbs: 0, fat: 5 },
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    mockGetMealByCloudIdLocal.mockResolvedValueOnce({
      userUid: "user-1",
      mealId: "meal-1",
      cloudId: "meal-1",
      timestamp: "2026-03-03T12:00:00.000Z",
      type: "lunch",
      name: "Local",
      ingredients: [],
      createdAt: "2026-03-03T12:00:00.000Z",
      updatedAt: "2026-03-03T12:40:00.000Z",
      syncState: "pending",
      source: "manual",
      imageId: null,
      photoUrl: null,
      notes: null,
      tags: [],
      deleted: false,
      totals: { kcal: 180, protein: 25, carbs: 5, fat: 4 },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mealsStrategy } = require("@/services/offline/strategies/meals.strategy");

    await mealsStrategy.pull("user-1");

    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "meal-1",
        name: "Local",
        updatedAt: "2026-03-03T12:40:00.000Z",
        syncState: "synced",
      }),
    );
    expect(mockEmit).not.toHaveBeenCalledWith(
      "meal:conflict:ambiguous",
      expect.anything(),
    );
  });

  it("does not overwrite a newer local offline edit with an older server snapshot after reconnect", async () => {
    mockFetchMealChangesRemote
      .mockResolvedValueOnce({
        items: [
          {
            userUid: "user-1",
            mealId: "meal-1",
            cloudId: "meal-1",
            timestamp: "2026-03-03T12:00:00.000Z",
            dayKey: "2026-03-03",
            type: "lunch",
            name: "Remote older copy",
            ingredients: [],
            createdAt: "2026-03-03T12:00:00.000Z",
            updatedAt: "2026-03-03T12:20:00.000Z",
            syncState: "synced",
            source: "manual",
            imageId: null,
            photoUrl: null,
            notes: null,
            tags: [],
            deleted: false,
            totals: { kcal: 200, protein: 30, carbs: 0, fat: 5 },
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    mockGetMealByCloudIdLocal.mockResolvedValueOnce({
      userUid: "user-1",
      mealId: "meal-1",
      cloudId: "meal-1",
      timestamp: "2026-03-03T12:00:00.000Z",
      dayKey: "2026-03-04",
      type: "lunch",
      name: "Local offline edit",
      ingredients: [],
      createdAt: "2026-03-03T12:00:00.000Z",
      updatedAt: "2026-03-03T12:45:00.000Z",
      syncState: "pending",
      source: "manual",
      imageId: null,
      photoUrl: null,
      notes: "keep newer local notes",
      tags: ["offline-edit"],
      deleted: false,
      totals: { kcal: 520, protein: 36, carbs: 42, fat: 20 },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mealsStrategy } = require("@/services/offline/strategies/meals.strategy");

    await mealsStrategy.pull("user-1");

    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "meal-1",
        name: "Local offline edit",
        dayKey: "2026-03-04",
        updatedAt: "2026-03-03T12:45:00.000Z",
        syncState: "synced",
        notes: "keep newer local notes",
        tags: ["offline-edit"],
        totals: { kcal: 520, protein: 36, carbs: 42, fat: 20 },
      }),
    );
    expect(mockEmit).toHaveBeenCalledWith("meal:synced", {
      uid: "user-1",
      cloudId: "meal-1",
      updatedAt: "2026-03-03T12:45:00.000Z",
    });
  });

  it("emits ambiguous conflict event when local and remote updates are within 5 minutes", async () => {
    mockFetchMealChangesRemote
      .mockResolvedValueOnce({
        items: [
          {
            userUid: "user-1",
            mealId: "meal-1",
            cloudId: "meal-1",
            timestamp: "2026-03-03T12:00:00.000Z",
            type: "lunch",
            name: "Remote",
            ingredients: [],
            createdAt: "2026-03-03T12:00:00.000Z",
            updatedAt: "2026-03-03T12:10:00.000Z",
            syncState: "synced",
            source: "manual",
            imageId: null,
            photoUrl: null,
            notes: null,
            tags: [],
            deleted: false,
            totals: { kcal: 200, protein: 30, carbs: 0, fat: 5 },
          },
        ],
        nextCursor: null,
      })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    mockGetMealByCloudIdLocal.mockResolvedValueOnce({
      userUid: "user-1",
      mealId: "meal-1",
      cloudId: "meal-1",
      timestamp: "2026-03-03T12:00:00.000Z",
      type: "lunch",
      name: "Local",
      ingredients: [],
      createdAt: "2026-03-03T12:00:00.000Z",
      updatedAt: "2026-03-03T12:12:00.000Z",
      syncState: "pending",
      source: "manual",
      imageId: null,
      photoUrl: null,
      notes: null,
      tags: [],
      deleted: false,
      totals: { kcal: 180, protein: 25, carbs: 5, fat: 4 },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mealsStrategy } = require("@/services/offline/strategies/meals.strategy");

    await mealsStrategy.pull("user-1");

    expect(mockEmit).toHaveBeenCalledWith("meal:conflict:ambiguous", {
      uid: "user-1",
      cloudId: "meal-1",
      resolvedAt: "2026-03-03T12:12:00.000Z",
    });
  });
});
