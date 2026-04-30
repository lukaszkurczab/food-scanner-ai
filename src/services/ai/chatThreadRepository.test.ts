import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetChatThreadsLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetChatMessagesPageLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpsertChatThreadLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertChatMessageLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetChatMessageSyncState = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockPullChatChanges = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockCaptureException = jest.fn<
  (message: string, context?: unknown, error?: unknown) => void
>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("@/services/core/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock("@/services/offline/chat.repo", () => ({
  getChatThreadsLocal: (...args: unknown[]) => mockGetChatThreadsLocal(...args),
  getChatMessagesPageLocal: (...args: unknown[]) =>
    mockGetChatMessagesPageLocal(...args),
  upsertChatThreadLocal: (...args: unknown[]) => mockUpsertChatThreadLocal(...args),
  upsertChatMessageLocal: (...args: unknown[]) => mockUpsertChatMessageLocal(...args),
  setChatMessageSyncState: (...args: unknown[]) =>
    mockSetChatMessageSyncState(...args),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pullChatChanges: (...args: unknown[]) => mockPullChatChanges(...args),
}));

jest.mock("@/services/core/errorLogger", () => ({
  captureException: (message: string, context?: unknown, error?: unknown) =>
    mockCaptureException(message, context, error),
}));

describe("services/ai/chatThreadRepository", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockGetChatThreadsLocal.mockResolvedValue([]);
    mockGetChatMessagesPageLocal.mockResolvedValue({
      items: [],
      nextBeforeCreatedAt: null,
    });
    mockUpsertChatThreadLocal.mockResolvedValue();
    mockUpsertChatMessageLocal.mockResolvedValue();
    mockSetChatMessageSyncState.mockResolvedValue();
    mockPullChatChanges.mockResolvedValue();
    mockGet.mockResolvedValue({ items: [], nextBeforeUpdatedAt: null });
  });

  it("persists user message as a local projection only", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      cacheUserChatMessageProjection,
    } = require("@/services/ai/chatThreadRepository");

    await cacheUserChatMessageProjection({
      userUid: "user-1",
      threadId: "thread-1",
      messageId: "msg-1",
      content: "hello",
      createdAt: 100,
      title: "First chat",
    });

    expect(mockUpsertChatThreadLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "thread-1",
        userUid: "user-1",
        title: "First chat",
        lastMessage: "hello",
      }),
    );
    expect(mockUpsertChatMessageLocal).toHaveBeenCalledWith({
      threadId: "thread-1",
      message: expect.objectContaining({
        id: "msg-1",
        role: "user",
        content: "hello",
        syncState: "pending",
      }),
    });
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSetChatMessageSyncState).not.toHaveBeenCalled();
  });

  it("persists assistant message as a synced local projection only", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      cacheAssistantChatMessageProjection,
    } = require("@/services/ai/chatThreadRepository");

    await cacheAssistantChatMessageProjection({
      userUid: "user-1",
      threadId: "thread-1",
      messageId: "msg-2",
      content: "AI response",
      createdAt: 101,
    });

    expect(mockUpsertChatMessageLocal).toHaveBeenCalledWith({
      threadId: "thread-1",
      message: expect.objectContaining({
        id: "msg-2",
        role: "assistant",
        content: "AI response",
        syncState: "synced",
      }),
    });
    expect(mockSetChatMessageSyncState).not.toHaveBeenCalled();
  });

  it("syncs older messages from backend when local page is undersized", async () => {
    mockGetChatMessagesPageLocal
      .mockResolvedValueOnce({
        items: [{ id: "m-local", createdAt: 300 }],
        nextBeforeCreatedAt: null,
      })
      .mockResolvedValueOnce({
        items: [
          { id: "m-local", createdAt: 300 },
          {
            id: "m-remote",
            userUid: "user-1",
            role: "assistant",
            content: "older",
            createdAt: 200,
            lastSyncedAt: 200,
            syncState: "synced",
          },
        ],
        nextBeforeCreatedAt: 200,
      });
    mockGet.mockResolvedValueOnce({
      items: [
        {
          id: "m-remote",
          role: "assistant",
          content: "older",
          createdAt: 200,
          lastSyncedAt: 200,
          deleted: false,
        },
      ],
      nextBeforeCreatedAt: 200,
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchChatThreadMessagesPage } = require("@/services/ai/chatThreadRepository");

    const page = await fetchChatThreadMessagesPage({
      userUid: "user-1",
      threadId: "thread-1",
      pageSize: 2,
      cursor: { beforeCreatedAt: 300 },
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v2/users/me/chat/threads/thread-1/messages?limit=2&beforeCreatedAt=300",
    );
    expect(mockUpsertChatMessageLocal).toHaveBeenCalledWith({
      threadId: "thread-1",
      message: expect.objectContaining({
        id: "m-remote",
        content: "older",
      }),
    });
    expect(page.nextCursor).toEqual({ beforeCreatedAt: 200 });
  });

  it("reads only local thread messages on thread message subscription mount", async () => {
    mockGetChatMessagesPageLocal
      .mockResolvedValueOnce({
        items: [],
        nextBeforeCreatedAt: null,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "m-remote",
            userUid: "user-1",
            role: "assistant",
            content: "thread message",
            createdAt: 200,
            lastSyncedAt: 200,
            syncState: "synced",
          },
        ],
        nextBeforeCreatedAt: null,
      });
    mockGet.mockResolvedValueOnce({
      items: [
        {
          id: "m-remote",
          role: "assistant",
          content: "thread message",
          createdAt: 200,
          lastSyncedAt: 200,
          deleted: false,
        },
      ],
      nextBeforeCreatedAt: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { subscribeToChatThreadMessages } = require("@/services/ai/chatThreadRepository");

    const unsubscribe = subscribeToChatThreadMessages({
      userUid: "user-1",
      threadId: "thread-1",
      pageSize: 50,
      onMessages: jest.fn(),
      onError: jest.fn(),
    });

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPullChatChanges).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalledWith(
      "/api/v2/users/me/chat/threads/thread-1/messages?limit=50",
    );
    unsubscribe();
  });

  it("does not trigger chat pull on thread subscription mount when online", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { subscribeToChatThreads } = require("@/services/ai/chatThreadRepository");

    const unsubscribe = subscribeToChatThreads({
      userUid: "user-1",
      onThreads: jest.fn(),
      onError: jest.fn(),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockPullChatChanges).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not trigger chat pull on thread subscription mount when offline", async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { subscribeToChatThreads } = require("@/services/ai/chatThreadRepository");

    const unsubscribe = subscribeToChatThreads({
      userUid: "user-1",
      onThreads: jest.fn(),
      onError: jest.fn(),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockPullChatChanges).not.toHaveBeenCalled();
    unsubscribe();
  });
});
