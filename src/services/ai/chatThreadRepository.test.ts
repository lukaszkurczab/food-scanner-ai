import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetChatThreadsLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetChatMessagesPageLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpsertChatThreadLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpsertChatMessageLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetChatMessageSyncState = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockEnqueueChatMessagePersist = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockCaptureException = jest.fn<
  (message: string, context?: unknown, error?: unknown) => void
>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("@/services/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
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

jest.mock("@/services/offline/queue.repo", () => ({
  enqueueChatMessagePersist: (...args: unknown[]) =>
    mockEnqueueChatMessagePersist(...args),
}));

jest.mock("@/services/errorLogger", () => ({
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
    mockEnqueueChatMessagePersist.mockResolvedValue();
    mockGet.mockResolvedValue({ items: [], nextBeforeUpdatedAt: null });
    mockPost.mockResolvedValue({ updated: true });
  });

  it("persists user message locally first and mirrors it to backend", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { persistUserChatMessage } = require("@/services/ai/chatThreadRepository");

    await persistUserChatMessage({
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
      }),
    });
    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/users/me/chat/threads/thread-1/messages",
      {
        messageId: "msg-1",
        role: "user",
        content: "hello",
        createdAt: 100,
        title: "First chat",
      },
    );
    expect(mockSetChatMessageSyncState).toHaveBeenCalledWith({
      userUid: "user-1",
      threadId: "thread-1",
      messageId: "msg-1",
      syncState: "synced",
      lastSyncedAt: 100,
    });
    expect(mockEnqueueChatMessagePersist).not.toHaveBeenCalled();
  });

  it("enqueues retry when backend persist fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("boom"));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { persistAssistantChatMessage } = require("@/services/ai/chatThreadRepository");

    await persistAssistantChatMessage({
      userUid: "user-1",
      threadId: "thread-1",
      messageId: "msg-2",
      content: "AI response",
      createdAt: 101,
    });

    expect(mockEnqueueChatMessagePersist).toHaveBeenCalledWith("user-1", {
      threadId: "thread-1",
      messageId: "msg-2",
      role: "assistant",
      content: "AI response",
      createdAt: 101,
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

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { fetchChatThreadMessagesPage } = require("@/services/ai/chatThreadRepository");

    const page = await fetchChatThreadMessagesPage({
      userUid: "user-1",
      threadId: "thread-1",
      pageSize: 2,
      cursor: { beforeCreatedAt: 300 },
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/users/me/chat/threads/thread-1/messages?limit=2&beforeCreatedAt=300",
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
});
