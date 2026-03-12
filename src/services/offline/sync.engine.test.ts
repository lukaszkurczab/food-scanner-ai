import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockNextBatch = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockMarkDone = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockBumpAttempts = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMoveToDeadLetter = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetPendingUploads = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetChatThreadByIdLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpsertChatThreadLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertChatMessageLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetChatMessageSyncState = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertMealLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetMealByCloudIdLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSetMealSyncStateLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertMyMealLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetMyMealSyncStateLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSaveMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMarkMealDeletedRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockFetchMealChangesRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateMyMealRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUploadMyMealPhotoRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUploadUserAvatarRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateUserProfileRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
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
  moveToDeadLetter: (...args: unknown[]) => mockMoveToDeadLetter(...args),
  MAX_QUEUE_ATTEMPTS: 10,
  enqueueUpsert: jest.fn(),
}));

jest.mock("@/services/offline/images.repo", () => ({
  getPendingUploads: (...args: unknown[]) => mockGetPendingUploads(...args),
  markUploaded: jest.fn(),
}));

jest.mock("@/services/offline/chat.repo", () => ({
  getChatThreadByIdLocal: (...args: unknown[]) =>
    mockGetChatThreadByIdLocal(...args),
  upsertChatThreadLocal: (...args: unknown[]) =>
    mockUpsertChatThreadLocal(...args),
  upsertChatMessageLocal: (...args: unknown[]) =>
    mockUpsertChatMessageLocal(...args),
  setChatMessageSyncState: (...args: unknown[]) =>
    mockSetChatMessageSyncState(...args),
}));

jest.mock("@/services/core/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
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

jest.mock("@/services/user/userProfileRepository", () => ({
  updateUserProfileRemote: (...args: unknown[]) =>
    mockUpdateUserProfileRemote(...args),
  uploadUserAvatarRemote: (...args: unknown[]) =>
    mockUploadUserAvatarRemote(...args),
}));

jest.mock("@/services/offline/meals.repo", () => ({
  upsertMealLocal: (...args: unknown[]) => mockUpsertMealLocal(...args),
  getMealByCloudIdLocal: (...args: unknown[]) => mockGetMealByCloudIdLocal(...args),
  setMealSyncStateLocal: (...args: unknown[]) => mockSetMealSyncStateLocal(...args),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  upsertMyMealLocal: (...args: unknown[]) => mockUpsertMyMealLocal(...args),
  setMyMealSyncStateLocal: (...args: unknown[]) => mockSetMyMealSyncStateLocal(...args),
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
    mockGet.mockResolvedValue({ items: [] });
    mockGetChatThreadByIdLocal.mockResolvedValue(null);
    mockUpsertChatThreadLocal.mockResolvedValue();
    mockUpsertChatMessageLocal.mockResolvedValue();
    mockUpsertMealLocal.mockResolvedValue();
    mockGetMealByCloudIdLocal.mockResolvedValue(null);
    mockSetMealSyncStateLocal.mockResolvedValue();
    mockUpsertMyMealLocal.mockResolvedValue();
    mockSetMyMealSyncStateLocal.mockResolvedValue();
    mockMoveToDeadLetter.mockResolvedValue();
    mockSaveMealRemote.mockResolvedValue();
    mockMarkMealDeletedRemote.mockResolvedValue();
    mockFetchMealChangesRemote
      .mockReset()
      .mockResolvedValue({ items: [], nextCursor: null });
    mockUpdateMyMealRemote.mockResolvedValue();
    mockUploadMyMealPhotoRemote.mockResolvedValue({
      imageId: "image-1",
      photoUrl: "https://cdn/mymeal.jpg",
    });
    mockUploadUserAvatarRemote.mockResolvedValue({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:11:00.000Z",
    });
    mockUpdateUserProfileRemote.mockResolvedValue();
    mockMarkMyMealDeletedRemote.mockResolvedValue();
    mockFetchMyMealChangesRemote
      .mockReset()
      .mockResolvedValue({ items: [], nextCursor: null });
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
    expect(mockSetMealSyncStateLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        cloudId: "meal-1",
        syncState: "synced",
      }),
    );
    expect(mockMarkDone).toHaveBeenCalledWith(2);
  });

  it("moves poisoned ops to dead letter after max retries", async () => {
    mockNextBatch
      .mockReset()
      .mockResolvedValueOnce([
        {
          id: 99,
          cloud_id: "meal-99",
          user_uid: "user-1",
          kind: "upsert",
          payload: {
            // missing cloudId/mealId makes op non-retryable and invalid
            userUid: "user-1",
            type: "lunch",
          },
          updated_at: "2026-03-03T12:00:00.000Z",
          attempts: 9,
        },
      ])
      .mockResolvedValueOnce([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    await pushQueue("user-1");

    expect(mockMoveToDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 99,
        kind: "upsert",
        attempts: 9,
      }),
      10,
      expect.objectContaining({
        code: "sync/upsert-missing-id",
      }),
    );
    expect(mockSetMealSyncStateLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        cloudId: "meal-99",
        syncState: "failed",
      }),
    );
    expect(mockBumpAttempts).not.toHaveBeenCalledWith(99);
    expect(mockMarkDone).not.toHaveBeenCalledWith(99);
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
    const { pullChanges } = require("@/services/offline/sync.engine");
    await pullChanges("user-1");

    expect(mockUpsertMealLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudId: "meal-1",
        name: "Local",
        updatedAt: "2026-03-03T12:40:00.000Z",
      }),
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
    expect(mockSetMyMealSyncStateLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        cloudId: "saved-1",
        syncState: "synced",
      }),
    );
    expect(mockMarkDone).toHaveBeenCalledWith(3);
  });

  it("replays queued avatar uploads through backend API", async () => {
    mockNextBatch
      .mockReset()
      .mockResolvedValueOnce([
        {
          id: 4,
          cloud_id: "profile_avatar",
          user_uid: "user-1",
          kind: "upload_user_avatar",
          payload: {
            localPath: "file://avatar.jpg",
            updatedAt: "2026-03-03T12:10:00.000Z",
          },
          updated_at: "2026-03-03T12:10:00.000Z",
          attempts: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    await pushQueue("user-1");

    expect(mockUploadUserAvatarRemote).toHaveBeenCalledWith(
      "user-1",
      "file://avatar.jpg",
    );
    expect(mockMarkDone).toHaveBeenCalledWith(4);
    expect(mockBumpAttempts).not.toHaveBeenCalledWith(4);
  });

  it("replays queued profile updates through backend API", async () => {
    mockNextBatch
      .mockReset()
      .mockResolvedValueOnce([
        {
          id: 40,
          cloud_id: "user_profile",
          user_uid: "user-1",
          kind: "update_user_profile",
          payload: {
            age: "31",
            calorieTarget: 2300,
          },
          updated_at: "2026-03-03T12:50:00.000Z",
          attempts: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    await pushQueue("user-1");

    expect(mockUpdateUserProfileRemote).toHaveBeenCalledWith("user-1", {
      age: "31",
      calorieTarget: 2300,
    });
    expect(mockMarkDone).toHaveBeenCalledWith(40);
    expect(mockBumpAttempts).not.toHaveBeenCalledWith(40);
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

  it("pulls chat thread changes and syncs messages for updated threads", async () => {
    mockGetItem.mockImplementation((key: unknown) =>
      Promise.resolve(
        key === "sync:last_pull_chat:user-1" ? "1700" : null,
      ),
    );
    mockGetChatThreadByIdLocal.mockResolvedValueOnce({
      id: "thread-1",
      userUid: "user-1",
      title: "Old thread",
      createdAt: 1000,
      updatedAt: 1600,
      lastMessage: "old",
      lastMessageAt: 1600,
    });
    mockGet
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread-1",
            title: "Updated thread",
            createdAt: 1000,
            updatedAt: 2000,
            lastMessage: "hello",
            lastMessageAt: 2000,
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "msg-1",
            role: "assistant",
            content: "hello",
            createdAt: 2000,
            lastSyncedAt: 2000,
            deleted: false,
          },
        ],
      });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pullChatChanges } = require("@/services/offline/sync.engine");

    await pullChatChanges("user-1");

    expect(mockGet).toHaveBeenNthCalledWith(1, "/users/me/chat/threads?limit=20");
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      "/users/me/chat/threads/thread-1/messages?limit=50",
    );
    expect(mockUpsertChatThreadLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "thread-1",
        userUid: "user-1",
        updatedAt: 2000,
      }),
    );
    expect(mockUpsertChatMessageLocal).toHaveBeenCalledWith({
      threadId: "thread-1",
      message: expect.objectContaining({
        id: "msg-1",
        userUid: "user-1",
        syncState: "synced",
      }),
    });
    expect(mockSetItem).toHaveBeenCalledWith("sync:last_pull_chat:user-1", "2000");
  });

  it("does not overwrite newer local chat thread state with stale remote thread", async () => {
    mockGetItem.mockImplementation((key: unknown) =>
      Promise.resolve(key === "sync:last_pull_chat:user-1" ? "1800" : null),
    );
    mockGetChatThreadByIdLocal.mockResolvedValueOnce({
      id: "thread-1",
      userUid: "user-1",
      title: "Local newer",
      createdAt: 1000,
      updatedAt: 2500,
      lastMessage: "local",
      lastMessageAt: 2500,
    });
    mockGet.mockResolvedValueOnce({
      items: [
        {
          id: "thread-1",
          title: "Remote older",
          createdAt: 1000,
          updatedAt: 2000,
          lastMessage: "remote",
          lastMessageAt: 2000,
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pullChatChanges } = require("@/services/offline/sync.engine");

    await pullChatChanges("user-1");

    expect(mockUpsertChatThreadLocal).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith("sync:last_pull_chat:user-1", "2000");
  });
});
