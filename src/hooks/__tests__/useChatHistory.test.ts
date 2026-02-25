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
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();
const mockUuid = jest.fn<() => string>();
const mockAskDietAI = jest.fn<
  (
    text: string,
    meals: Meal[],
    history: Array<{ from: "user" | "ai"; text: string }>,
    profile: FormData,
  ) => Promise<string>
>();
const mockGetApp = jest.fn<() => { app: string }>();
const mockGetFirestore = jest.fn<(app?: unknown) => { db: string }>();
const mockCollection = jest.fn<
  (...args: unknown[]) => { type: "collection"; args: unknown[] }
>();
const mockDoc = jest.fn<(...args: unknown[]) => { type: "doc"; args: unknown[] }>();
const mockQuery = jest.fn<(...args: unknown[]) => { type: "query"; args: unknown[] }>();
const mockOrderBy = jest.fn<(field: string, direction: string) => { field: string; direction: string }>();
const mockLimit = jest.fn<(value: number) => { limit: number }>();
const mockStartAfter = jest.fn<(value: unknown) => { after: unknown }>();
const mockGetDocs = jest.fn<(q: unknown) => Promise<Snapshot>>();
const mockSetDoc = jest.fn<
  (ref: unknown, data: Record<string, unknown>, options?: { merge: boolean }) => Promise<void>
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

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

jest.mock("@/services/askDietAI", () => ({
  askDietAI: (
    text: string,
    meals: Meal[],
    history: Array<{ from: "user" | "ai"; text: string }>,
    profile: FormData,
  ) => mockAskDietAI(text, meals, history, profile),
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
    mockGetItem.mockResolvedValue("0");
    mockSetItem.mockResolvedValue();
    mockAskDietAI.mockResolvedValue("AI response");
    mockGetApp.mockReturnValue({ app: "test-app" });
    mockGetFirestore.mockReturnValue({ db: "test-db" });
    mockCollection.mockImplementation((...args: unknown[]) => ({
      type: "collection",
      args,
    }));
    mockDoc.mockImplementation((...args: unknown[]) => ({ type: "doc", args }));
    mockQuery.mockImplementation((...args: unknown[]) => ({ type: "query", args }));
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
    expect(mockGetItem).not.toHaveBeenCalled();

    let sendResult: string | null = null;
    await act(async () => {
      sendResult = await result.current.send("hello");
    });
    expect(sendResult).toBeNull();
    expect(mockNetInfoFetch).toHaveBeenCalledTimes(1);
  });

  it("loads daily count and enforces free-tier message limit", async () => {
    mockGetItem.mockResolvedValueOnce("invalid-number");
    const { result, unmount } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();
    await waitFor(() => {
      expect(result.current.countToday).toBe(0);
    });
    expect(result.current.canSend).toBe(true);
    unmount();

    mockGetItem.mockResolvedValueOnce("5");
    const { result: limitedResult } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();
    await waitFor(() => {
      expect(limitedResult.current.countToday).toBe(5);
    });
    expect(limitedResult.current.canSend).toBe(false);

    const { result: premiumResult } = renderHook(() =>
      useChatHistory("user-1", true, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();
    await waitFor(() => {
      expect(premiumResult.current.countToday).toBe(0);
    });
    expect(premiumResult.current.canSend).toBe(true);
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

    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockGetDocs).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
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
    mockGetItem.mockResolvedValue("5");
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
    const nowSpy = jest.spyOn(Date, "now").mockImplementation(() => 1_700_000_000_000);
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

    expect(mockAskDietAI).toHaveBeenCalledTimes(1);
    expect(mockAskDietAI.mock.calls[0][0]).toBe(
      "This is a very long message that is definitely longer than forty two chars",
    );
    expect(mockAskDietAI.mock.calls[0][2]).toEqual([
      {
        from: "user",
        text: "This is a very long message that is definitely longer than forty two chars",
      },
    ]);

    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem.mock.calls[0][1]).toBe("1");
    expect(result.current.sending).toBe(false);
    expect(result.current.typing).toBe(false);

    nowSpy.mockRestore();
  });

  it("updates existing thread and handles AI failures without throwing", async () => {
    mockAskDietAI.mockRejectedValueOnce(new Error("AI failed"));
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
    expect(aiPayload.content).toBe("");

    const batch = mockCreatedBatches[0];
    expect(batch.set.mock.calls[0][2]).toEqual({ merge: true });
  });

  it("resets daily counter after user sign-out and handles short local title", async () => {
    mockGetItem.mockResolvedValueOnce("3");
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
    const localThreadPayload = localBatch.set.mock.calls[0][1] as Record<string, unknown>;
    expect(localThreadPayload.title).toBe("short title");

    rerender({ uid: "" });
    await settle();
    await waitFor(() => {
      expect(result.current.countToday).toBe(0);
    });
  });

  it("handles missing daily counter value from storage", async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() =>
      useChatHistory("user-1", false, mealsFixture, profileFixture, "thread-1"),
    );
    await settle();

    await waitFor(() => {
      expect(result.current.countToday).toBe(0);
    });
  });
});
