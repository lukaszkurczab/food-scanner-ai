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
const mockApiPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
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
const mockGetDeadLetterCount = jest.fn<(uid: string, options?: unknown) => Promise<number>>();
const mockRetryDeadLetterOps = jest.fn<(params: unknown) => Promise<number>>();
const mockPushQueue = jest.fn<(uid: string) => Promise<void>>();

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
  post: (url: string, data?: unknown) => mockApiPost(url, data),
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
}));

jest.mock("@/services/offline/queue.repo", () => ({
  getDeadLetterCount: (uid: string, options?: unknown) =>
    mockGetDeadLetterCount(uid, options),
  retryDeadLetterOps: (params: unknown) => mockRetryDeadLetterOps(params),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pushQueue: (uid: string) => mockPushQueue(uid),
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
  await waitFor(() => {
    expect(mockGetDeadLetterCount).toHaveBeenCalled();
  });
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
      reply: "AI response",
      userId: "user-1",
      tier: "free",
      balance: 19,
      allocation: 100,
      periodStartAt: "2026-03-01T00:00:00.000Z",
      periodEndAt: "2026-04-01T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
    });
    mockFetchChatThreadMessagesPage.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    mockPersistUserChatMessage.mockResolvedValue();
    mockPersistAssistantChatMessage.mockResolvedValue();
    mockGetDeadLetterCount.mockResolvedValue(0);
    mockRetryDeadLetterOps.mockResolvedValue(0);
    mockPushQueue.mockResolvedValue();
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

  it("applies inline credits from successful /ai/ask responses", async () => {
    mockUuid
      .mockReturnValueOnce("thread-created")
      .mockReturnValueOnce("user-msg")
      .mockReturnValueOnce("ai-msg");

    const { result } = await renderChatHistoryHook();

    let createdThreadId: string | null = null;
    await act(async () => {
      createdThreadId = await result.current.send("hello");
    });

    expect(createdThreadId).toBe("thread-created");
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
    expect(mockApplyCreditsFromResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        balance: 19,
        allocation: 100,
      }),
    );
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
    expect(mockPersistAssistantChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "limit.reachedShort",
      }),
    );
  });

  it("does not refresh credits on gateway reject responses", async () => {
    mockApiPost.mockRejectedValueOnce({
      status: 400,
      details: { reason: "OFF_TOPIC" },
    });

    const { result } = await renderChatHistoryHook();

    await act(async () => {
      await result.current.send("Flaga Boliwii");
    });

    expect(mockRefreshCredits).not.toHaveBeenCalled();
    expect(mockPersistAssistantChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Moge odpowiadac tylko na pytania o zywienie i diete.",
      }),
    );
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

  it("reads failed chat sync count and retries dead-letter ops", async () => {
    mockGetDeadLetterCount.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    mockRetryDeadLetterOps.mockResolvedValueOnce(2);

    const { result } = await renderChatHistoryHook();

    await waitFor(() => {
      expect(result.current.failedSyncCount).toBe(2);
    });

    await act(async () => {
      await result.current.retryFailedSyncOps();
    });

    expect(mockRetryDeadLetterOps).toHaveBeenCalledWith({
      uid: "user-1",
      kinds: ["persist_chat_message"],
    });
    expect(mockPushQueue).toHaveBeenCalledWith("user-1");
  });

  it("retries failed chat sync locally without push when offline", async () => {
    mockGetDeadLetterCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    mockRetryDeadLetterOps.mockResolvedValueOnce(1);
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });

    const { result } = await renderChatHistoryHook();

    await waitFor(() => {
      expect(result.current.failedSyncCount).toBe(1);
    });

    await act(async () => {
      await result.current.retryFailedSyncOps();
    });

    expect(mockRetryDeadLetterOps).toHaveBeenCalled();
    expect(mockPushQueue).not.toHaveBeenCalled();
  });
});
