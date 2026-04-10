import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockFetchMyMealChangesRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateMyMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUploadMyMealPhotoRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockMarkMyMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertMyMealLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetMyMealSyncStateLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
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

jest.mock("@/services/meals/myMealsRepository", () => ({
  buildMyMealUpdatedCursor: (meal: { updatedAt: string; cloudId?: string }) =>
    `${meal.updatedAt}|${meal.cloudId || meal.updatedAt}`,
  fetchMyMealChangesRemote: (...args: unknown[]) => mockFetchMyMealChangesRemote(...args),
  markMyMealDeletedRemote: (...args: unknown[]) => mockMarkMyMealDeletedRemote(...args),
  updateMyMealRemote: (...args: unknown[]) => mockUpdateMyMealRemote(...args),
  uploadMyMealPhotoRemote: (...args: unknown[]) => mockUploadMyMealPhotoRemote(...args),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  upsertMyMealLocal: (...args: unknown[]) => mockUpsertMyMealLocal(...args),
  setMyMealSyncStateLocal: (...args: unknown[]) => mockSetMyMealSyncStateLocal(...args),
}));

jest.mock("@/services/core/events", () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

describe("myMeals strategy", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
    mockFetchMyMealChangesRemote
      .mockReset()
      .mockResolvedValue({ items: [], nextCursor: null });
    mockUpdateMyMealRemote.mockResolvedValue();
    mockUploadMyMealPhotoRemote.mockResolvedValue({
      imageId: "image-1",
      photoUrl: "https://cdn/mymeal.jpg",
    });
    mockMarkMyMealDeletedRemote.mockResolvedValue();
    mockUpsertMyMealLocal.mockResolvedValue();
    mockSetMyMealSyncStateLocal.mockResolvedValue();
  });

  it("handles saved meal upsert push ops and uploads local photo", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { myMealsStrategy } = require("@/services/offline/strategies/myMeals.strategy");

    const handled = await myMealsStrategy.handlePushOp("user-1", {
      id: 3,
      cloud_id: "saved-1",
      user_uid: "user-1",
      kind: "upsert_mymeal",
      payload: {
        cloudId: "saved-1",
        mealId: "saved-1",
        userUid: "user-1",
        timestamp: "2026-03-03T12:00:00.000Z",
        type: "lunch",
        ingredients: [],
        createdAt: "2026-03-03T12:00:00.000Z",
        updatedAt: "2026-03-03T12:10:00.000Z",
        source: "saved",
        photoUrl: "file://saved.jpg",
      },
      updated_at: "2026-03-03T12:10:00.000Z",
      attempts: 0,
    });

    expect(handled).toBe(true);
    expect(mockUploadMyMealPhotoRemote).toHaveBeenCalledWith(
      "user-1",
      "saved-1",
      "file://saved.jpg",
    );
    expect(mockUpdateMyMealRemote).toHaveBeenCalledWith(
      "user-1",
      "saved-1",
      expect.objectContaining({
        mealId: "saved-1",
        cloudId: "saved-1",
        source: "saved",
        imageId: "image-1",
        photoUrl: "https://cdn/mymeal.jpg",
      }),
    );
    expect(mockUpsertMyMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "saved-1",
        photoLocalPath: "file://saved.jpg",
      }),
    );
    expect(mockSetMyMealSyncStateLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        cloudId: "saved-1",
        syncState: "synced",
      }),
    );
  });

  it("pulls saved meal changes and advances the saved meals cursor", async () => {
    mockFetchMyMealChangesRemote.mockResolvedValueOnce({
      items: [
        {
          userUid: "user-1",
          mealId: "saved-1",
          cloudId: "saved-1",
          timestamp: "2026-03-03T12:00:00.000Z",
          type: "lunch",
          name: "Saved meal",
          ingredients: [],
          createdAt: "2026-03-03T12:00:00.000Z",
          updatedAt: "2026-03-03T12:40:00.000Z",
          syncState: "synced",
          source: "saved",
          imageId: null,
          photoUrl: null,
          notes: null,
          tags: [],
          deleted: false,
          totals: { kcal: 200, protein: 30, carbs: 0, fat: 5 },
        },
      ],
      nextCursor: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { myMealsStrategy } = require("@/services/offline/strategies/myMeals.strategy");

    const synced = await myMealsStrategy.pull("user-1");

    expect(synced).toBe(1);
    expect(mockFetchMyMealChangesRemote).toHaveBeenCalledWith({
      uid: "user-1",
      pageSize: 100,
      cursor: "1970-01-01T00:00:00.000Z",
    });
    expect(mockUpsertMyMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "saved-1",
        updatedAt: "2026-03-03T12:40:00.000Z",
      }),
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      "sync:last_pull_my_meals:user-1",
      "2026-03-03T12:40:00.000Z|saved-1",
    );
  });
});
