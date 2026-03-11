import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockNextBatch = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockMarkDone = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockBumpAttempts = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetPendingUploads = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSetChatMessageSyncState = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertMealLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertMyMealLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSaveMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMarkMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockFetchMealChangesRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateMyMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUploadMyMealPhotoRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockMarkMyMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockFetchMyMealChangesRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: (...args: []) => mockNetInfoFetch(...args),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

jest.mock("@/services/offline/queue.repo", () => ({
  nextBatch: (...args: unknown[]) => mockNextBatch(...args),
  markDone: (...args: unknown[]) => mockMarkDone(...args),
  bumpAttempts: (...args: unknown[]) => mockBumpAttempts(...args),
  enqueueUpsert: jest.fn(),
}));

jest.mock("@/services/offline/images.repo", () => ({
  getPendingUploads: (...args: unknown[]) => mockGetPendingUploads(...args),
  markUploaded: jest.fn(),
}));

jest.mock("@/services/offline/chat.repo", () => ({
  setChatMessageSyncState: (...args: unknown[]) =>
    mockSetChatMessageSyncState(...args),
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (...args: unknown[]) => mockPost(...args),
}));

jest.mock("@/services/meals/mealsRepository", () => ({
  buildMealUpdatedCursor: (meal: { updatedAt: string; cloudId?: string }) =>
    `${meal.updatedAt}|${meal.cloudId || meal.updatedAt}`,
  fetchMealChangesRemote: (...args: unknown[]) => mockFetchMealChangesRemote(...args),
  markMealDeletedRemote: (...args: unknown[]) => mockMarkMealDeletedRemote(...args),
  saveMealRemote: (...args: unknown[]) => mockSaveMealRemote(...args),
}));

jest.mock("@/services/meals/myMealsRepository", () => ({
  buildMyMealUpdatedCursor: (meal: { updatedAt: string; cloudId?: string }) =>
    `${meal.updatedAt}|${meal.cloudId || meal.updatedAt}`,
  fetchMyMealChangesRemote: (...args: unknown[]) =>
    mockFetchMyMealChangesRemote(...args),
  markMyMealDeletedRemote: (...args: unknown[]) =>
    mockMarkMyMealDeletedRemote(...args),
  updateMyMealRemote: (...args: unknown[]) => mockUpdateMyMealRemote(...args),
  uploadMyMealPhotoRemote: (...args: unknown[]) =>
    mockUploadMyMealPhotoRemote(...args),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  upsertMealLocal: (...args: unknown[]) => mockUpsertMealLocal(...args),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  upsertMyMealLocal: (...args: unknown[]) => mockUpsertMyMealLocal(...args),
}));

jest.mock("@/services/offline/db", () => ({
  getDB: jest.fn(() => ({
    getAllSync: jest.fn(() => []),
    runSync: jest.fn(),
  })),
}));

jest.mock("@/services/meals/mealService.images", () => ({
  processAndUpload: jest.fn(),
}));

describe("offline sync.engine", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
    mockGetPendingUploads.mockResolvedValue([]);
    mockUpsertMealLocal.mockResolvedValue();
    mockUpsertMyMealLocal.mockResolvedValue();
    mockSaveMealRemote.mockResolvedValue();
    mockMarkMealDeletedRemote.mockResolvedValue();
    mockFetchMealChangesRemote.mockResolvedValue({ items: [], nextCursor: null });
    mockUpdateMyMealRemote.mockResolvedValue();
    mockUploadMyMealPhotoRemote.mockResolvedValue({
      imageId: "image-1",
      photoUrl: "https://cdn/mymeal.jpg",
    });
    mockMarkMyMealDeletedRemote.mockResolvedValue();
    mockFetchMyMealChangesRemote.mockResolvedValue({ items: [], nextCursor: null });
    mockNextBatch
      .mockResolvedValueOnce([
        {
          id: 1,
          cloud_id: "msg-1",
          user_uid: "user-1",
          kind: "persist_chat_message",
          payload: {
            threadId: "thread-1",
            messageId: "msg-1",
            role: "assistant",
            content: "hello",
            createdAt: 100,
          },
          updated_at: "2026-03-01T00:00:00.000Z",
          attempts: 0,
        },
      ])
      .mockResolvedValueOnce([]);
    mockPost.mockResolvedValue({ updated: true });
    mockSetChatMessageSyncState.mockResolvedValue();
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as never);
    jest.spyOn(global, "clearInterval").mockImplementation(() => {});
  });

  it("replays queued chat messages through backend and marks them synced", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    await pushQueue("user-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/users/me/chat/threads/thread-1/messages",
      {
        messageId: "msg-1",
        role: "assistant",
        content: "hello",
        createdAt: 100,
        title: undefined,
      },
    );
    expect(mockSetChatMessageSyncState).toHaveBeenCalledWith({
      userUid: "user-1",
      threadId: "thread-1",
      messageId: "msg-1",
      syncState: "synced",
      lastSyncedAt: 100,
    });
    expect(mockMarkDone).toHaveBeenCalledWith(1);
    expect(mockBumpAttempts).not.toHaveBeenCalled();
  });

  it("replays queued meal upserts through backend API", async () => {
    mockNextBatch
      .mockReset()
      .mockResolvedValueOnce([
        {
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
        },
      ])
      .mockResolvedValueOnce([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    await pushQueue("user-1");

    expect(mockSaveMealRemote).toHaveBeenCalledWith({
      uid: "user-1",
      meal: expect.objectContaining({
        cloudId: "meal-1",
        mealId: "meal-1",
        userUid: "user-1",
        type: "lunch",
      }),
    });
    expect(mockMarkDone).toHaveBeenCalledWith(2);
  });

  it("pulls meal changes from backend and advances the stored cursor", async () => {
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
    const { pullChanges } = require("@/services/offline/sync.engine");

    await pullChanges("user-1");

    expect(mockFetchMealChangesRemote).toHaveBeenCalledWith({
      uid: "user-1",
      pageSize: 100,
      cursor: "1970-01-01T00:00:00.000Z",
    });
    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "meal-1",
        updatedAt: "2026-03-03T12:30:00.000Z",
      }),
    );
    expect(mockSetItem).toHaveBeenCalledWith(
      "sync:last_pull_ts:user-1",
      "2026-03-03T12:30:00.000Z|meal-1",
    );
  });

  it("replays queued saved meal upserts through backend API and uploads local photo", async () => {
    mockNextBatch
      .mockReset()
      .mockResolvedValueOnce([
        {
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
        },
      ])
      .mockResolvedValueOnce([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    await pushQueue("user-1");

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
    expect(mockMarkDone).toHaveBeenCalledWith(3);
  });

  it("pulls saved meal changes from backend and advances the saved meals cursor", async () => {
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
    const { pullMyMealChanges } = require("@/services/offline/sync.engine");

    await pullMyMealChanges("user-1");

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
