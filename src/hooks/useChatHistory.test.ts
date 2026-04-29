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
const mockI18nT = jest.fn<(key: string, options?: unknown) => string>();
const mockApiPost = jest.fn<
  (url: string, data?: unknown, options?: unknown) => Promise<unknown>
>();
const mockCaptureException = jest.fn<
  (message: string, context?: unknown, error?: unknown) => void
>();
const mockUseAiCreditsContext = jest.fn();
const mockApplyCreditsFromResponse = jest.fn();
const mockRefreshCredits = jest.fn<() => Promise<unknown>>();
const mockCanAfford = jest.fn(() => true);
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
const mockMarkChatMessageProjectionSynced = jest.fn<
  (params: unknown) => Promise<void>
>();
const mockPushQueue = jest.fn<(uid: string) => Promise<void>>();
const mockPullChatChanges = jest.fn<(uid: string) => Promise<void>>();

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
    language: "en",
    t: (key: string, options?: unknown) => mockI18nT(key, options),
  },
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (url: string, data?: unknown, options?: unknown) =>
    mockApiPost(url, data, options),
}));

jest.mock("@/services/core/errorLogger", () => ({
  captureException: (message: string, context?: unknown, error?: unknown) =>
    mockCaptureException(message, context, error),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => mockUseAiCreditsContext(),
}));

jest.mock("@/services/ai/chatThreadRepository", () => ({
  subscribeToChatThreadMessages: (params: {
    onMessages: (items: RepoMessage[], nextCursor: unknown) => void;
  }) => {
    mockSubscribeToChatThreadMessages(params);
    snapshotNext = params.onMessages;
    return mockUnsubscribe;
  },
  fetchChatThreadMessagesPage: (params: unknown) =>
    mockFetchChatThreadMessagesPage(params),
  persistUserChatMessage: (params: unknown) =>
    mockPersistUserChatMessage(params),
  persistAssistantChatMessage: (params: unknown) =>
    mockPersistAssistantChatMessage(params),
  markChatMessageProjectionSynced: (params: unknown) =>
    mockMarkChatMessageProjectionSynced(params),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  requestSync: (params: { uid: string }) => mockPushQueue(params.uid),
  pushQueue: (uid: string) => mockPushQueue(uid),
  pullChatChanges: (uid: string) => mockPullChatChanges(uid),
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

function buildCredits(overrides?: Partial<{
  tier: "free" | "premium";
  balance: number;
  allocation: number;
}>) {
  return {
    userId: "user-1",
    tier: overrides?.tier ?? "free",
    balance: overrides?.balance ?? 20,
    allocation: overrides?.allocation ?? 100,
    periodStartAt: "2026-03-01T00:00:00.000Z",
    periodEndAt: "2026-04-01T00:00:00.000Z",
    costs: { chat: 1, textMeal: 1, photo: 5 },
  };
}

async function renderChatHistoryHook(params?: {
  uid?: string;
  threadId?: string;
  pageSize?: number;
}) {
  const uid = params?.uid ?? "user-1";
  const threadId = params?.threadId ?? "local-thread";
  const pageSize = params?.pageSize;
  const rendered = renderHook(() =>
    useChatHistory(uid, mealsFixture, profileFixture, threadId, pageSize ? { pageSize } : {}),
  );
  await Promise.resolve();
  return rendered;
}

describe("useChatHistory", () => {
  beforeEach(() => {
    snapshotNext = null;
    jest.clearAllMocks();

    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockI18nT.mockImplementation((key: string, options?: unknown) => {
      if (typeof options === "string") return options;
      return key;
    });
    mockApiPost.mockResolvedValue({
      runId: "run-1",
      threadId: "thread-created",
      clientMessageId: "user-msg",
      reply: "AI response",
      assistantMessageId: "assistant-msg",
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
      contextStats: {
        usedSummary: false,
        historyTurns: 1,
        truncated: false,
        scopeDecision: "ALLOW_NUTRITION",
      },
      credits: null,
      persistence: "backend_owned",
    });
    mockFetchChatThreadMessagesPage.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    mockPersistUserChatMessage.mockResolvedValue();
    mockPersistAssistantChatMessage.mockResolvedValue();
    mockMarkChatMessageProjectionSynced.mockResolvedValue();
    mockPushQueue.mockResolvedValue();
    mockPullChatChanges.mockResolvedValue();
    mockUuid.mockImplementation(() => `uuid-${mockUuid.mock.calls.length}`);
    mockRefreshCredits.mockResolvedValue(buildCredits({ balance: 0 }));
    mockCanAfford.mockReturnValue(true);
    mockUseAiCreditsContext.mockReturnValue({
      credits: buildCredits(),
      loading: false,
      canAfford: mockCanAfford,
      applyCreditsFromResponse: mockApplyCreditsFromResponse,
      refreshCredits: mockRefreshCredits,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("derives send ability and counters from shared credits state", async () => {
    mockCanAfford.mockReturnValue(false);
    mockUseAiCreditsContext.mockReturnValue({
      credits: buildCredits({ balance: 0 }),
      loading: false,
      canAfford: mockCanAfford,
      applyCreditsFromResponse: mockApplyCreditsFromResponse,
      refreshCredits: mockRefreshCredits,
    });

    const { result } = await renderChatHistoryHook();

    expect(result.current.canSend).toBe(false);
    expect(result.current.creditAllocation).toBe(100);
    expect(result.current.creditBalance).toBe(0);
    expect(result.current.creditsUsed).toBe(100);
  });

  it("sends the minimal AI Chat v2 contract to /api/v2/ai/chat/runs", async () => {
    mockUuid
      .mockReturnValueOnce("request-1")
      .mockReturnValueOnce("thread-created")
      .mockReturnValueOnce("user-msg")
      .mockReturnValueOnce("ai-msg");

    const { result } = await renderChatHistoryHook();

    let createdThreadId: string | null = null;
    await act(async () => {
      createdThreadId = await result.current.send("hello");
    });

    expect(createdThreadId).toBe("thread-created");
    expect(mockApiPost).toHaveBeenCalledTimes(1);
    const call = mockApiPost.mock.calls[0];
    expect(call?.[0]).toBe("/api/v2/ai/chat/runs");
    expect(call?.[1]).toEqual({
      threadId: "thread-created",
      clientMessageId: "user-msg",
      message: "hello",
      language: "en",
    });
    expect(call?.[2]).toEqual(
      expect.objectContaining({ signal: expect.any(Object) }),
    );
    expect(mockApplyCreditsFromResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        threadId: "thread-created",
        clientMessageId: "user-msg",
        assistantMessageId: "assistant-msg",
        persistence: "backend_owned",
        credits: null,
      }),
    );
    expect(mockPersistUserChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userUid: "user-1",
        threadId: "thread-created",
        messageId: "user-msg",
        content: "hello",
        syncState: "pending",
      }),
    );
    expect(mockMarkChatMessageProjectionSynced).toHaveBeenCalledWith({
      userUid: "user-1",
      threadId: "thread-created",
      messageId: "user-msg",
      lastSyncedAt: expect.any(Number),
    });
    expect(mockRefreshCredits).not.toHaveBeenCalled();
  });

  it("refreshes credits after backend 402 and persists limit fallback", async () => {
    mockApiPost.mockRejectedValueOnce(
      Object.assign(new Error("payment required"), { status: 402 }),
    );

    const { result } = await renderChatHistoryHook();

    await act(async () => {
      await result.current.send("hello");
    });

    expect(mockRefreshCredits).toHaveBeenCalledTimes(1);
    expect(mockPersistAssistantChatMessage).not.toHaveBeenCalled();
  });

  it("does not refresh credits on gateway reject responses", async () => {
    mockApiPost.mockRejectedValueOnce({
      status: 400,
      details: {
        detail: {
          code: "AI_GATEWAY_BLOCKED",
          message: "AI request blocked by gateway",
          reason: "OFF_TOPIC",
        },
      },
    });

    const { result } = await renderChatHistoryHook();

    await act(async () => {
      await result.current.send("Flaga Boliwii");
    });

    expect(mockRefreshCredits).not.toHaveBeenCalled();
    expect(mockPersistAssistantChatMessage).not.toHaveBeenCalled();
  });

  it("enters degraded disabled state and blocks retry context when backend kill switch is active", async () => {
    mockApiPost.mockRejectedValueOnce({
      status: 503,
      details: {
        detail: {
          code: "AI_CHAT_DISABLED",
          message: "AI Chat v2 is temporarily disabled.",
        },
      },
    });
    mockUuid
      .mockReturnValueOnce("request-1")
      .mockReturnValueOnce("thread-created")
      .mockReturnValueOnce("user-msg")
      .mockReturnValueOnce("ai-msg");

    const { result } = await renderChatHistoryHook();

    let createdThreadId: string | null = null;
    await act(async () => {
      createdThreadId = await result.current.send("hello");
    });

    expect(createdThreadId).toBe("thread-created");
    expect(result.current.sendErrorType).toBe("disabled");
    expect(mockRefreshCredits).not.toHaveBeenCalled();
    expect(mockPersistAssistantChatMessage).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(
      "[useChatHistory.send] AI chat v2 disabled by backend kill switch",
      { userUid: "user-1", threadId: "thread-created" },
      expect.objectContaining({ code: "ai/disabled" }),
    );

    await act(async () => {
      await result.current.retryLastSend();
    });

    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it("deduplicates double-tap send intents while request is in flight", async () => {
    let resolvePost: ((value: unknown) => void) | null = null;
    const pendingPost = new Promise((resolve) => {
      resolvePost = resolve;
    });
    mockApiPost.mockReturnValueOnce(pendingPost);

    const { result } = await renderChatHistoryHook();

    let firstPromise: Promise<string | null> | null = null;
    let secondResult: string | null = "sentinel";
    await act(async () => {
      firstPromise = result.current.send("hello");
    });
    await act(async () => {
      secondResult = await result.current.send("hello");
    });

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });

    const resolveInFlightPost = resolvePost;
    if (!resolveInFlightPost || !firstPromise) {
      throw new Error(
        "Expected in-flight /api/v2/ai/chat/runs call before resolving test promise.",
      );
    }

    (resolveInFlightPost as (value: unknown) => void)({
      runId: "run-2",
      threadId: "thread-created",
      clientMessageId: "user-msg",
      reply: "AI response",
      assistantMessageId: "assistant-msg",
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
      contextStats: {
        usedSummary: false,
        historyTurns: 1,
        truncated: false,
        scopeDecision: "ALLOW_NUTRITION",
      },
      credits: null,
      persistence: "backend_owned",
    });

    await act(async () => {
      await firstPromise;
    });

    expect(secondResult).toBeNull();
    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockPersistUserChatMessage).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("retries the failed assistant reply without persisting a duplicate user message", async () => {
    mockApiPost
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { status: 504 }))
      .mockResolvedValueOnce({
        runId: "run-retry",
        threadId: "thread-created",
        clientMessageId: "user-msg",
        reply: "Recovered response",
        assistantMessageId: "ai-msg-2",
        usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
        contextStats: {
          usedSummary: false,
          historyTurns: 1,
          truncated: false,
          scopeDecision: "ALLOW_NUTRITION",
        },
        credits: null,
        persistence: "backend_owned",
      });
    mockUuid
      .mockReturnValueOnce("request-1")
      .mockReturnValueOnce("thread-created")
      .mockReturnValueOnce("user-msg")
      .mockReturnValueOnce("ai-msg-1")
      .mockReturnValueOnce("request-2")
      .mockReturnValueOnce("ai-msg-2");

    const { result } = await renderChatHistoryHook();

    await act(async () => {
      await result.current.send("hello");
    });

    await act(async () => {
      await result.current.retryLastSend();
    });

    expect(mockPersistUserChatMessage).toHaveBeenCalledTimes(1);
    expect(mockApiPost).toHaveBeenCalledTimes(2);
    expect(mockPersistAssistantChatMessage).toHaveBeenCalledTimes(1);
    expect(mockPersistAssistantChatMessage).toHaveBeenCalledWith({
      userUid: "user-1",
      threadId: "thread-created",
      messageId: "ai-msg-2",
      content: "Recovered response",
      createdAt: expect.any(Number),
    });
    expect(mockMarkChatMessageProjectionSynced).toHaveBeenCalledWith({
      userUid: "user-1",
      threadId: "thread-created",
      messageId: "user-msg",
      lastSyncedAt: expect.any(Number),
    });
  });

  it("cancels in-flight send and does not persist assistant fallback on abort", async () => {
    let rejectPost: ((reason?: unknown) => void) | null = null;
    const pendingPost = new Promise((_, reject) => {
      rejectPost = reject;
    });
    mockApiPost.mockReturnValueOnce(pendingPost);

    const { result } = await renderChatHistoryHook();

    await act(async () => {
      const pendingSend = result.current.send("hello");
      result.current.cancelInFlightSend();
      rejectPost?.({
        code: "api/aborted",
        source: "ApiClient",
        retryable: false,
      });
      await pendingSend;
    });

    expect(mockPersistAssistantChatMessage).not.toHaveBeenCalled();
  });

  it("maps incoming snapshots and loads next pages", async () => {
    const { result } = await renderChatHistoryHook({
      threadId: "thread-1",
      pageSize: 2,
    });

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
            content: "first",
            createdAt: 200,
            lastSyncedAt: 200,
            syncState: "synced",
          },
        ],
        { cursor: "c1" },
      );
    });

    mockFetchChatThreadMessagesPage.mockResolvedValueOnce({
      items: [
        {
          id: "m2",
          userUid: "user-1",
          role: "assistant",
          content: "older",
          createdAt: 100,
          lastSyncedAt: 100,
          syncState: "synced",
        },
      ],
      nextCursor: null,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.messages.map((message) => message.id)).toEqual(["m1", "m2"]);
  });

  it("blocks offline sends without queueing a successful chat message", async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });

    const { result } = await renderChatHistoryHook();

    await act(async () => {
      await result.current.send("hello offline");
    });

    expect(result.current.sendErrorType).toBe("offline");
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(mockPersistUserChatMessage).not.toHaveBeenCalled();
    expect(mockPersistAssistantChatMessage).not.toHaveBeenCalled();
    expect(mockPushQueue).not.toHaveBeenCalled();
  });
});
