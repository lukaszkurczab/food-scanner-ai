import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGetItem = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockSetItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetChatThreadByIdLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpsertChatThreadLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertChatMessageLocal = jest.fn<(...args: unknown[]) => Promise<void>>();

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

jest.mock("@/services/core/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock("@/services/offline/chat.repo", () => ({
  getChatThreadByIdLocal: (...args: unknown[]) => mockGetChatThreadByIdLocal(...args),
  upsertChatThreadLocal: (...args: unknown[]) => mockUpsertChatThreadLocal(...args),
  upsertChatMessageLocal: (...args: unknown[]) => mockUpsertChatMessageLocal(...args),
}));

describe("chat strategy", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue();
    mockGet.mockResolvedValue({ items: [] });
    mockGetChatThreadByIdLocal.mockResolvedValue(null);
    mockUpsertChatThreadLocal.mockResolvedValue();
    mockUpsertChatMessageLocal.mockResolvedValue();
  });

  it("pulls chat thread changes and syncs messages for updated threads", async () => {
    mockGetItem.mockImplementation((key: unknown) =>
      Promise.resolve(key === "sync:last_pull_chat:user-1" ? "1700" : null),
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
    const { chatStrategy } = require("@/services/offline/strategies/chat.strategy");

    const synced = await chatStrategy.pull("user-1");

    expect(synced).toBe(2);
    expect(mockGet).toHaveBeenNthCalledWith(1, "/users/me/chat/threads?limit=100");
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
    const { chatStrategy } = require("@/services/offline/strategies/chat.strategy");

    await chatStrategy.pull("user-1");

    expect(mockUpsertChatThreadLocal).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith("sync:last_pull_chat:user-1", "2000");
  });

  it("paginates chat threads when backend returns nextBeforeUpdatedAt cursor", async () => {
    mockGetItem.mockImplementation((key: unknown) =>
      Promise.resolve(key === "sync:last_pull_chat:user-1" ? "1200" : null),
    );
    mockGetChatThreadByIdLocal.mockResolvedValue(null);
    mockGet
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread-1",
            title: "First page",
            createdAt: 1000,
            updatedAt: 1900,
            lastMessage: "hello 1",
            lastMessageAt: 1900,
          },
        ],
        nextBeforeUpdatedAt: 1800,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "msg-1",
            role: "assistant",
            content: "hello 1",
            createdAt: 1900,
            lastSyncedAt: 1900,
            deleted: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread-2",
            title: "Second page",
            createdAt: 1100,
            updatedAt: 1700,
            lastMessage: "hello 2",
            lastMessageAt: 1700,
          },
        ],
        nextBeforeUpdatedAt: null,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "msg-2",
            role: "assistant",
            content: "hello 2",
            createdAt: 1700,
            lastSyncedAt: 1700,
            deleted: false,
          },
        ],
      });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chatStrategy } = require("@/services/offline/strategies/chat.strategy");

    await chatStrategy.pull("user-1");

    expect(mockGet).toHaveBeenCalledWith("/users/me/chat/threads?limit=100");
    expect(mockGet).toHaveBeenCalledWith(
      "/users/me/chat/threads?limit=100&beforeUpdatedAt=1800",
    );
    expect(mockUpsertChatThreadLocal).toHaveBeenCalledTimes(2);
    expect(mockSetItem).toHaveBeenCalledWith("sync:last_pull_chat:user-1", "1900");
  });
});
