import { act, renderHook, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { FormData, Meal } from "@/types";
import { useChatHistory } from "@/hooks/useChatHistory";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockUuid = jest.fn<() => string>();
const mockI18nT = jest.fn<(key: string, fallback?: string) => string>();
const mockApiGet = jest.fn<(url: string) => Promise<unknown>>();
const mockApiPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
const mockCaptureException = jest.fn<
  (message: string, context?: unknown, error?: unknown) => void
>();
const mockSubscribeToChatThreadMessages = jest.fn();
const mockFetchChatThreadMessagesPage = jest.fn<
  (params: unknown) => Promise<unknown>
>();
const mockPersistUserChatMessage = jest.fn<
  (params: unknown) => Promise<void>
>();
const mockPersistAssistantChatMessage = jest.fn<
  (params: unknown) => Promise<void>
>();

type RepoMessage = {
  id: string;
  userUid: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  lastSyncedAt: number;
  syncState: "synced" | "pending" | "conflict";
  deleted?: boolean;
  cloudId?: string;
};

let snapshotNext:
  | ((items: RepoMessage[], nextCursor: unknown) => void)
  | null = null;
let snapshotError: ((error: unknown) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    t: (key: string, fallback?: string) => mockI18nT(key, fallback),
  },
}));

jest.mock("@/services/apiClient", () => ({
  get: (url: string) => mockApiGet(url),
  post: (url: string, data?: unknown) => mockApiPost(url, data),
}));

jest.mock("@/services/errorLogger", () => ({
  captureException: (message: string, context?: unknown, error?: unknown) =>
    mockCaptureException(message, context, error),
}));

jest.mock("@/services/ai/chatThreadRepository", () => ({
  subscribeToChatThreadMessages: (params: {
    onMessages: (items: RepoMessage[], nextCursor: unknown) => void;
    onError?: (error: unknown) => void;
  }) => {
    mockSubscribeToChatThreadMessages(params);
    snapshotNext = params.onMessages;
    snapshotError = params.onError ?? null;
    return mockUnsubscribe;
  },
  fetchChatThreadMessagesPage: (params: unknown) =>
    mockFetchChatThreadMessagesPage(params),
  persistUserChatMessage: (params: unknown) =>
    mockPersistUserChatMessage(params),
  persistAssistantChatMessage: (params: unknown) =>
    mockPersistAssistantChatMessage(params),
}));

const profileFixture: FormData = {
  unitsSystem: "metric",
  age: "30",
  sex: "male",
  height: "180",
  weight: "80",
  preferences: [],
  activityLevel: "moderate",
  goal: "maintain",
  surveyComplited: true,
  calorieTarget: 2300,
};

const mealsFixture: Meal[] = [];
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("useChatHistory", () => {
  beforeEach(() => {
    snapshotNext = null;
    snapshotError = null;
    jest.clearAllMocks();

    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockI18nT.mockImplementation(
      (_key: string, fallback?: string) => fallback || "fallback",
    );
    mockApiGet.mockResolvedValue({
      dateKey: "2026-03-02",
      usageCount: 3,
      dailyLimit: 20,
      remaining: 17,
    });
    mockApiPost.mockResolvedValue({
      reply: "AI response",
      usageCount: 4,
      remaining: 16,
    });
    mockFetchChatThreadMessagesPage.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    mockPersistUserChatMessage.mockResolvedValue();
    mockPersistAssistantChatMessage.mockResolvedValue();
    mockUuid.mockImplementation(() => `uuid-${mockUuid.mock.calls.length}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sets empty state when base collection is unavailable", async () => {
    const { result } = renderHook(() =>
      useChatHistory("", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.canSend).toBe(true);
    expect(mockApiGet).not.toHaveBeenCalled();
    expect(mockSubscribeToChatThreadMessages).not.toHaveBeenCalled();
    expect(result.current.dailyLimit).toBe(5);
    expect(result.current.remaining).toBe(5);

    let sendResult: string | null = null;
    await act(async () => {
      sendResult = await result.current.send("hello");
    });
    expect(sendResult).toBeNull();
    expect(mockNetInfoFetch).toHaveBeenCalledTimes(1);
  });

  it("loads usage from backend and enforces free-tier message limit", async () => {
    mockApiGet.mockResolvedValueOnce({
      dateKey: "2026-03-02",
      usageCount: 0,
      dailyLimit: 20,
      remaining: 20,
    });

    const { result, unmount } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.countToday).toBe(0);
    });
    expect(result.current.canSend).toBe(true);
    expect(result.current.dailyLimit).toBe(20);
    expect(result.current.remaining).toBe(20);
    unmount();

    mockApiGet.mockResolvedValueOnce({
      dateKey: "2026-03-02",
      usageCount: 20,
      dailyLimit: 20,
      remaining: 0,
    });

    const { result: limitedResult } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(limitedResult.current.countToday).toBe(20);
    });
    expect(limitedResult.current.canSend).toBe(false);
    expect(limitedResult.current.dailyLimit).toBe(20);
    expect(limitedResult.current.remaining).toBe(0);

    const { result: premiumResult } = renderHook(() =>
      useChatHistory("user-1", true, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(premiumResult.current.countToday).toBe(3);
    });
    expect(premiumResult.current.canSend).toBe(true);
    expect(premiumResult.current.dailyLimit).toBe(20);
  });

  it("loads usage from backend and updates chat quota from ai/ask responses", async () => {
    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.countToday).toBe(3);
    });

    expect(result.current.dailyLimit).toBe(20);
    expect(result.current.canSend).toBe(true);
    expect(mockApiGet).toHaveBeenCalledWith("/ai/usage");

    await act(async () => {
      await result.current.send("hello");
    });

    await waitFor(() => {
      expect(result.current.countToday).toBe(4);
    });

    expect(result.current.usageCount).toBe(4);
    expect(result.current.dailyLimit).toBe(20);
    expect(result.current.remaining).toBe(16);
    expect(result.current.canSend).toBe(true);
    expect(mockApiPost).toHaveBeenCalledWith("/ai/ask", {
      message: "hello",
      context: {
        actionType: "chat",
        meals: mealsFixture,
        profile: profileFixture,
        history: [{ from: "user", text: "hello" }],
        language: "en",
      },
    });
  });

  it("maps snapshot docs, loads next pages and deduplicates by id", async () => {
    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1", {
        pageSize: 2,
      }),
    );
    await settle();

    await waitFor(() => {
      expect(mockSubscribeToChatThreadMessages).toHaveBeenCalledTimes(1);
    });

    act(() => {
      snapshotNext?.([], null);
      snapshotNext?.(
        [
          {
            id: "m1",
            userUid: "user-1",
            role: "user",
            content: "first",
            createdAt: 200,
            lastSyncedAt: 200,
            syncState: "synced",
          },
          {
            id: "m2",
            userUid: "user-1",
            role: "assistant",
            content: "",
            createdAt: 0,
            lastSyncedAt: 0,
            syncState: "synced",
          },
        ],
        { cursor: "c1" },
      );
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("");

    mockFetchChatThreadMessagesPage.mockResolvedValueOnce({
      items: [
        {
          id: "m1",
          userUid: "user-1",
          role: "user",
          content: "first",
          createdAt: 200,
          lastSyncedAt: 200,
          syncState: "synced",
        },
        {
          id: "m3",
          userUid: "user-1",
          role: "assistant",
          content: "older",
          createdAt: 100,
          lastSyncedAt: 100,
          syncState: "synced",
        },
      ],
      nextCursor: { cursor: "c2" },
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetchChatThreadMessagesPage).toHaveBeenCalledTimes(1);
    expect(result.current.messages.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
  });

  it("reorders an existing message when same id arrives with different createdAt", async () => {
    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1", {
        pageSize: 2,
      }),
    );
    await settle();

    await waitFor(() => {
      expect(mockSubscribeToChatThreadMessages).toHaveBeenCalledTimes(1);
    });

    act(() => {
      snapshotNext?.(
        [
          {
            id: "m1",
            userUid: "user-1",
            role: "user",
            content: "first-version",
            createdAt: 200,
            lastSyncedAt: 200,
            syncState: "synced",
          },
          {
            id: "m2",
            userUid: "user-1",
            role: "assistant",
            content: "second",
            createdAt: 150,
            lastSyncedAt: 150,
            syncState: "synced",
          },
        ],
        { cursor: "c1" },
      );
    });

    await waitFor(() => {
      expect(result.current.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    });

    mockFetchChatThreadMessagesPage.mockResolvedValueOnce({
      items: [
        {
          id: "m1",
          userUid: "user-1",
          role: "user",
          content: "updated-version",
          createdAt: 90,
          lastSyncedAt: 210,
          syncState: "synced",
        },
      ],
      nextCursor: null,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["m2", "m1"]);
    expect(result.current.messages.find((m) => m.id === "m1")?.content).toBe(
      "updated-version",
    );
  });

  it("sets loading=false when snapshot listener fails", async () => {
    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(mockSubscribeToChatThreadMessages).toHaveBeenCalledTimes(1);
    });

    act(() => {
      snapshotError?.(new Error("snapshot failed"));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("returns null in send for blank text, exhausted quota and offline mode", async () => {
    mockApiGet.mockResolvedValue({
      dateKey: "2026-03-02",
      usageCount: 20,
      dailyLimit: 20,
      remaining: 0,
    });
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });

    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    let blank: string | null = null;
    await act(async () => {
      blank = await result.current.send("   ");
    });
    expect(blank).toBeNull();

    await waitFor(() => {
      expect(result.current.canSend).toBe(false);
    });

    let quotaBlocked: string | null = null;
    await act(async () => {
      quotaBlocked = await result.current.send("hello");
    });
    expect(quotaBlocked).toBeNull();

    const { result: premiumResult } = renderHook(() =>
      useChatHistory("user-1", true, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    let offlineBlocked: string | null = null;
    await act(async () => {
      offlineBlocked = await premiumResult.current.send("hello");
    });
    expect(offlineBlocked).toBeNull();

    expect(mockPersistUserChatMessage).not.toHaveBeenCalled();
  });

  it("creates a new thread for local IDs and persists user + ai messages", async () => {
    const nowSpy = jest
      .spyOn(Date, "now")
      .mockImplementation(() => 1_700_000_000_000);
    mockUuid
      .mockReturnValueOnce("thread-created")
      .mockReturnValueOnce("user-msg")
      .mockReturnValueOnce("ai-msg");

    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "local-temp"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let newThreadId: string | null = null;
    await act(async () => {
      newThreadId = await result.current.send(
        "  This is a very long message that is definitely longer than forty two chars  ",
      );
    });

    expect(newThreadId).toBe("thread-created");
    expect(mockPersistUserChatMessage).toHaveBeenCalledTimes(1);
    const userPersistCall = mockPersistUserChatMessage.mock.calls[0][0] as {
      title?: string;
    };
    expect(typeof userPersistCall.title).toBe("string");
    expect(String(userPersistCall.title).endsWith("…")).toBe(true);

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockApiPost.mock.calls[0][0]).toBe("/ai/ask");
    expect(mockPersistAssistantChatMessage).toHaveBeenCalledTimes(1);
    expect(result.current.sending).toBe(false);
    expect(result.current.typing).toBe(false);

    nowSpy.mockRestore();
  });

  it("updates existing thread and handles ai failures without throwing", async () => {
    mockApiPost.mockRejectedValueOnce(new Error("AI failed"));
    mockUuid.mockReturnValueOnce("user-msg").mockReturnValueOnce("ai-msg");

    const { result } = renderHook(() =>
      useChatHistory("user-1", true, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    act(() => {
      snapshotNext?.(
        [
          {
            id: "old-ai",
            userUid: "user-1",
            role: "assistant",
            content: "assistant message",
            createdAt: 70,
            lastSyncedAt: 70,
            syncState: "synced",
          },
          {
            id: "old-user",
            userUid: "user-1",
            role: "user",
            content: "previous",
            createdAt: 50,
            lastSyncedAt: 50,
            syncState: "synced",
          },
        ],
        { cursor: "existing" },
      );
    });

    let sendResult: string | null = null;
    await act(async () => {
      sendResult = await result.current.send("hello");
    });

    expect(sendResult).toBeNull();
    expect(mockPersistAssistantChatMessage).toHaveBeenCalledTimes(1);
    const aiPayload = mockPersistAssistantChatMessage.mock.calls[0][0] as {
      content: string;
    };
    expect(aiPayload.content).toBe(
      "Could not fetch a response. Please try again.",
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      "[useChatHistory.send] failed to send AI chat message",
      {
        userUid: "user-1",
        threadId: "thread-1",
        message: "hello",
      },
      expect.any(Error),
    );
    expect(result.current.sending).toBe(false);
    expect(result.current.typing).toBe(false);
    expect(result.current.sendErrorType).toBe("unknown");
  });

  it("maps timeout failures to a retryable timeout response message", async () => {
    mockApiPost.mockRejectedValueOnce(
      Object.assign(new Error("timeout"), {
        code: "api/timeout",
        source: "ApiClient",
        retryable: true,
      }),
    );
    mockUuid.mockReturnValueOnce("user-msg").mockReturnValueOnce("ai-msg");

    const { result } = renderHook(() =>
      useChatHistory("user-1", true, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await act(async () => {
      await result.current.send("hello");
    });

    expect(mockPersistAssistantChatMessage).toHaveBeenCalledTimes(1);
    const aiPayload = mockPersistAssistantChatMessage.mock.calls[0][0] as {
      content: string;
    };
    expect(aiPayload.content).toBe("The request timed out. Please retry.");
    expect(result.current.sendErrorType).toBe("timeout");
  });

  it("shows off-topic fallback message when gateway rejects request", async () => {
    mockApiPost.mockRejectedValueOnce({
      status: 400,
      details: { reason: "OFF_TOPIC", credit_cost: 0.2 },
    });
    mockUuid.mockReturnValueOnce("user-msg").mockReturnValueOnce("ai-msg");

    const { result } = renderHook(() =>
      useChatHistory("user-1", true, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await act(async () => {
      await result.current.send("Flaga Boliwii");
    });

    expect(mockPersistAssistantChatMessage).toHaveBeenCalledTimes(1);
    const aiPayload = mockPersistAssistantChatMessage.mock.calls[0][0] as {
      content: string;
    };
    expect(aiPayload.content).toBe(
      "Moge odpowiadac tylko na pytania o zywienie i diete.",
    );
    expect(result.current.sending).toBe(false);
    expect(result.current.typing).toBe(false);
  });

  it("blocks further sends after backend 429 limit errors", async () => {
    mockApiPost.mockRejectedValueOnce(
      Object.assign(new Error("limit"), { status: 429 }),
    );

    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.dailyLimit).toBe(20);
    });

    await act(async () => {
      await result.current.send("hello");
    });

    await waitFor(() => {
      expect(result.current.canSend).toBe(false);
    });

    expect(result.current.countToday).toBe(20);
    expect(result.current.dailyLimit).toBe(20);
    expect(result.current.remaining).toBe(0);
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it("resets usage after user sign-out and handles short local title", async () => {
    const { result, rerender } = renderHook(
      ({ uid }: { uid: string }) =>
        useChatHistory(uid, false, mealsFixture, profileFixture, "local-thread"),
      { initialProps: { uid: "user-1" } },
    );
    await settle();

    await waitFor(() => {
      expect(result.current.countToday).toBe(3);
    });

    mockUuid
      .mockReturnValueOnce("local-created")
      .mockReturnValueOnce("local-user")
      .mockReturnValueOnce("local-ai");

    await act(async () => {
      await result.current.send("short title");
    });
    const localThreadPayload = mockPersistUserChatMessage.mock.calls[
      mockPersistUserChatMessage.mock.calls.length - 1
    ][0] as { title?: string };
    expect(localThreadPayload.title).toBe("short title");

    rerender({ uid: "" });
    await settle();

    await waitFor(() => {
      expect(result.current.countToday).toBe(0);
    });
  });

  it("falls back to defaults when loading usage fails", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("usage failed"));

    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.countToday).toBe(0);
    });
    expect(result.current.dailyLimit).toBe(5);
    expect(result.current.remaining).toBe(5);
    expect(mockCaptureException).toHaveBeenCalledWith(
      "[useChatHistory] failed to load AI usage",
      { userUid: "user-1" },
      expect.any(Error),
    );
  });
});
