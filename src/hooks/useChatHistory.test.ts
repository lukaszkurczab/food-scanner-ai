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

type DocData = Record<string, unknown>;
type SnapshotDoc = { id: string; data: () => DocData };
type Snapshot = { docs: SnapshotDoc[] };

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockUuid = jest.fn<() => string>();
const mockI18nT = jest.fn<(key: string, fallback?: string) => string>();
const mockApiGet = jest.fn<(url: string) => Promise<unknown>>();
const mockApiPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
const mockCaptureException = jest.fn<
  (message: string, context?: unknown, error?: unknown) => void
>();
const mockGetApp = jest.fn<() => { app: string }>();
const mockGetFirestore = jest.fn<(app?: unknown) => { db: string }>();
const mockCollection = jest.fn<
  (...args: unknown[]) => { type: "collection"; args: unknown[] }
>();
const mockDoc = jest.fn<(...args: unknown[]) => { type: "doc"; args: unknown[] }>();
const mockQuery = jest.fn<(...args: unknown[]) => { type: "query"; args: unknown[] }>();
const mockOrderBy = jest.fn<
  (field: string, direction: string) => { field: string; direction: string }
>();
const mockLimit = jest.fn<(value: number) => { limit: number }>();
const mockStartAfter = jest.fn<(value: unknown) => { after: unknown }>();
const mockGetDocs = jest.fn<(q: unknown) => Promise<Snapshot>>();
const mockSetDoc = jest.fn<
  (
    ref: unknown,
    data: Record<string, unknown>,
    options?: { merge: boolean },
  ) => Promise<void>
>();

type Batch = {
  set: ReturnType<typeof jest.fn>;
  commit: ReturnType<typeof jest.fn>;
};
const mockCreatedBatches: Batch[] = [];
const mockWriteBatch = jest.fn(() => {
  const batch = {
    set: jest.fn(),
    commit: jest.fn<() => Promise<void>>().mockResolvedValue(),
  };
  mockCreatedBatches.push(batch);
  return batch;
});

let snapshotNext: ((snap: Snapshot) => void) | null = null;
let snapshotError: ((error: unknown) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockOnSnapshot = jest.fn(
  (
    _query: unknown,
    onNext: (snap: Snapshot) => void,
    onError: (error: unknown) => void,
  ) => {
    snapshotNext = onNext;
    snapshotError = onError;
    return mockUnsubscribe;
  },
);

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

jest.mock("@react-native-firebase/app", () => ({
  getApp: () => mockGetApp(),
}));

jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: (app: unknown) => mockGetFirestore(app),
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (field: string, direction: string) => mockOrderBy(field, direction),
  limit: (value: number) => mockLimit(value),
  onSnapshot: (
    queryValue: unknown,
    onNext: (snap: Snapshot) => void,
    onError: (error: unknown) => void,
  ) => mockOnSnapshot(queryValue, onNext, onError),
  startAfter: (value: unknown) => mockStartAfter(value),
  getDocs: (queryValue: unknown) => mockGetDocs(queryValue),
  setDoc: (
    ref: unknown,
    data: Record<string, unknown>,
    options?: { merge: boolean },
  ) => mockSetDoc(ref, data, options),
  writeBatch: () => mockWriteBatch(),
}));

const makeDoc = (id: string, data: DocData): SnapshotDoc => ({
  id,
  data: () => data,
});

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
    mockCreatedBatches.length = 0;
    snapshotNext = null;
    snapshotError = null;
    jest.clearAllMocks();

    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockI18nT.mockImplementation(
      (_key: string, fallback?: string) => fallback || "fallback",
    );
    mockApiGet.mockResolvedValue({
      userId: "user-1",
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
    mockGetApp.mockReturnValue({ app: "test-app" });
    mockGetFirestore.mockReturnValue({ db: "test-db" });
    mockCollection.mockImplementation((...args: unknown[]) => ({
      type: "collection",
      args,
    }));
    mockDoc.mockImplementation((...args: unknown[]) => ({ type: "doc", args }));
    mockQuery.mockImplementation((...args: unknown[]) => ({
      type: "query",
      args,
    }));
    mockOrderBy.mockImplementation((field: string, direction: string) => ({
      field,
      direction,
    }));
    mockLimit.mockImplementation((value: number) => ({ limit: value }));
    mockStartAfter.mockImplementation((value: unknown) => ({ after: value }));
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockSetDoc.mockResolvedValue();
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
      userId: "user-1",
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
      userId: "user-1",
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
    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/ai/usage?userId=user-1");

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
    expect(mockApiPost).toHaveBeenCalledWith("/api/v1/ai/ask", {
      userId: "user-1",
      message: "hello",
      context: {
        meals: mealsFixture,
        profile: profileFixture,
        history: [{ from: "user", text: "hello" }],
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
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });

    act(() => {
      snapshotNext?.(null as unknown as Snapshot);
      snapshotNext?.({ docs: [] });
      snapshotNext?.({
        docs: [
          makeDoc("m1", {
            role: "user",
            content: "first",
            createdAt: 200,
            lastSyncedAt: 200,
          }),
          makeDoc("m2", {
            role: "unknown",
            content: 123,
            createdAt: "bad",
            lastSyncedAt: null,
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("");

    mockGetDocs.mockResolvedValueOnce({
      docs: [
        makeDoc("m1", {
          role: "user",
          content: "first",
          createdAt: 200,
          lastSyncedAt: 200,
        }),
        makeDoc("m3", {
          role: "assistant",
          content: "older",
          createdAt: 100,
          lastSyncedAt: 100,
        }),
      ],
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(result.current.messages.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
  });

  it("sets loading=false when snapshot listener fails", async () => {
    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
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
      userId: "user-1",
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

    expect(mockWriteBatch).not.toHaveBeenCalled();
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
    expect(mockWriteBatch).toHaveBeenCalledTimes(1);

    const batch = mockCreatedBatches[0];
    expect(batch.commit).toHaveBeenCalledTimes(1);
    expect(batch.set).toHaveBeenCalledTimes(2);
    const threadPayload = batch.set.mock.calls[0][1] as Record<string, unknown>;
    expect(typeof threadPayload.title).toBe("string");
    expect(String(threadPayload.title).endsWith("…")).toBe(true);

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockApiPost.mock.calls[0][0]).toBe("/api/v1/ai/ask");
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
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
      snapshotNext?.({
        docs: [
          makeDoc("old-ai", {
            role: "assistant",
            content: "assistant message",
            createdAt: 70,
            lastSyncedAt: 70,
          }),
          makeDoc("old-user", {
            role: "user",
            content: "previous",
            createdAt: 50,
            lastSyncedAt: 50,
          }),
        ],
      });
    });

    let sendResult: string | null = null;
    await act(async () => {
      sendResult = await result.current.send("hello");
    });

    expect(sendResult).toBeNull();
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    const aiPayload = mockSetDoc.mock.calls[0][1] as Record<string, unknown>;
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
    const localBatch = mockCreatedBatches[mockCreatedBatches.length - 1];
    const localThreadPayload = localBatch.set.mock.calls[0][1] as Record<
      string,
      unknown
    >;
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
