import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import NetInfo from "@react-native-community/netinfo";
import {
  createPendingQueue,
  fullSync,
  isOnline,
  lastWriteWins,
  onceOnline,
  onReconnect,
  withRetry,
} from "@/utils/syncUtils";

type NetState = { isConnected: boolean };
type QueueItem = { id?: string };

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

const fetchMock = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;
const addEventListenerMock = NetInfo.addEventListener as jest.MockedFunction<
  typeof NetInfo.addEventListener
>;

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("withRetry", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns on first successful attempt", async () => {
    const fn = jest.fn(async () => "ok");

    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries with exponential backoff and then succeeds", async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockResolvedValue("ok");
    const delaySpy = jest
      .spyOn(global, "setTimeout")
      .mockImplementation((cb: TimerHandler) => {
        if (typeof cb === "function") cb();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });

    await expect(withRetry(fn, { retries: 3, baseMs: 10, maxMs: 100 })).resolves.toBe(
      "ok",
    );

    expect(fn).toHaveBeenCalledTimes(3);
    expect(delaySpy).toHaveBeenNthCalledWith(1, expect.any(Function), 10);
    expect(delaySpy).toHaveBeenNthCalledWith(2, expect.any(Function), 20);
  });

  it("throws the last error when retries are exhausted", async () => {
    const fn = jest.fn(async () => {
      throw new Error("final-error");
    });
    jest.spyOn(global, "setTimeout").mockImplementation((cb: TimerHandler) => {
      if (typeof cb === "function") cb();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    await expect(withRetry(fn, { retries: 2, baseMs: 1 })).rejects.toThrow(
      "final-error",
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("network helpers", () => {
  let reconnectListener: ((state: NetState) => void) | undefined;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    reconnectListener = undefined;
    unsubscribe = jest.fn();
    fetchMock.mockReset();
    addEventListenerMock.mockReset();
    addEventListenerMock.mockImplementation((cb: unknown) => {
      reconnectListener = cb as (state: NetState) => void;
      return unsubscribe;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("runs reconnect action from both initial fetch and listener", async () => {
    fetchMock.mockResolvedValue({ isConnected: true } as never);
    const action = jest.fn();

    const unsub = onReconnect(action);
    await flushMicrotasks();
    reconnectListener?.({ isConnected: false });
    reconnectListener?.({ isConnected: true });

    expect(action).toHaveBeenCalledTimes(2);
    expect(unsub).toBe(unsubscribe);
  });

  it("checks online state through NetInfo.fetch", async () => {
    fetchMock.mockResolvedValueOnce({ isConnected: true } as never);
    fetchMock.mockResolvedValueOnce({ isConnected: false } as never);

    await expect(isOnline()).resolves.toBe(true);
    await expect(isOnline()).resolves.toBe(false);
  });

  it("onceOnline resolves immediately when already connected", async () => {
    fetchMock.mockResolvedValue({ isConnected: true } as never);

    await expect(onceOnline()).resolves.toBeUndefined();
    expect(addEventListenerMock).not.toHaveBeenCalled();
  });

  it("onceOnline waits for reconnect event and unsubscribes", async () => {
    fetchMock.mockResolvedValue({ isConnected: false } as never);

    const pending = onceOnline();
    await flushMicrotasks();
    reconnectListener?.({ isConnected: false });
    reconnectListener?.({ isConnected: true });
    await expect(pending).resolves.toBeUndefined();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("lastWriteWins", () => {
  it("chooses local, remote, or equal based on parsed timestamps", () => {
    expect(lastWriteWins("2026-01-02T10:00:00.000Z", "2026-01-01T10:00:00.000Z")).toBe(
      "local",
    );
    expect(lastWriteWins(1000, 2000)).toBe("remote");
    expect(lastWriteWins(null, null)).toBe("equal");
  });
});

describe("createPendingQueue and fullSync", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    addEventListenerMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("processes queued items when online", async () => {
    fetchMock.mockResolvedValue({ isConnected: true } as never);
    const processor = jest.fn(async (_item: QueueItem): Promise<void> => undefined);
    const queue = createPendingQueue(processor, { concurrency: 1 });

    queue.enqueue({ id: "a" });
    queue.enqueue({ id: "b" });
    await flushMicrotasks();
    await flushMicrotasks();

    const processedIds = processor.mock.calls.map((call) => call[0]?.id);
    expect(processedIds).toEqual(expect.arrayContaining(["a", "b"]));
    expect(queue.size()).toBe(0);
  });

  it("keeps items in queue while offline", async () => {
    fetchMock.mockResolvedValue({ isConnected: false } as never);
    const processor = jest.fn(async (_item: QueueItem): Promise<void> => undefined);
    const queue = createPendingQueue(processor);

    queue.enqueue({ id: "offline" });
    await queue.flush();
    await flushMicrotasks();

    expect(processor).not.toHaveBeenCalled();
    expect(queue.size()).toBe(1);
  });

  it("covers runNext guard branches for empty queue, concurrency and online checks", async () => {
    const firstProcessing = { resolve: (() => undefined) as () => void };
    const waitForFirst = new Promise<void>((resolve) => {
      firstProcessing.resolve = resolve;
    });
    const processor = jest.fn(
      async (_item: QueueItem): Promise<void> => undefined,
    );
    processor
      .mockImplementationOnce(async (_item: QueueItem) => waitForFirst)
      .mockImplementationOnce(async (_item: QueueItem) => undefined);

    fetchMock.mockResolvedValue({ isConnected: true } as never);
    const queue = createPendingQueue(processor, { concurrency: 1 });

    await queue.flush();
    await flushMicrotasks();

    queue.enqueue({ id: "first" });
    await flushMicrotasks();
    queue.enqueue({ id: "second" });
    await flushMicrotasks();

    expect(processor).toHaveBeenCalledTimes(1);

    firstProcessing.resolve();
    await flushMicrotasks();
    await flushMicrotasks();
    expect(processor).toHaveBeenCalledTimes(2);

    fetchMock
      .mockResolvedValueOnce({ isConnected: true } as never)
      .mockResolvedValueOnce({ isConnected: false } as never);
    queue.enqueue({ id: "offline-runNext" });
    await flushMicrotasks();
    expect(queue.size()).toBe(1);
  });

  it("processes next queued item via runNext chaining", async () => {
    const processor = jest.fn(async (_item: QueueItem): Promise<void> => undefined);
    const queue = createPendingQueue(processor, { concurrency: 1 });

    fetchMock
      .mockResolvedValueOnce({ isConnected: false } as never)
      .mockResolvedValueOnce({ isConnected: false } as never)
      .mockResolvedValue({ isConnected: true } as never);
    queue.enqueue({ id: "chained-1" });
    queue.enqueue({ id: "chained-2" });

    await queue.flush();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(processor).toHaveBeenCalledWith({ id: "chained-1" });
    expect(processor).toHaveBeenCalledWith({ id: "chained-2" });
    expect(queue.size()).toBe(0);
  });

  it("retries failed queue items with backoff delay", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({ isConnected: true } as never);
    const processor = jest
      .fn(async (_item: QueueItem): Promise<void> => undefined)
      .mockRejectedValueOnce(new Error("temporary"));
    const queue = createPendingQueue(processor, {
      baseMs: 10,
      maxMs: 100,
      concurrency: 1,
    });

    queue.enqueue({ id: "retry-item" });
    await flushMicrotasks();

    await jest.advanceTimersByTimeAsync(20);
    await flushMicrotasks();
    await flushMicrotasks();

    expect(processor.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(queue.size()).toBe(0);
  });

  it("attaches online listener once, supports clear and detach", () => {
    const processor = jest.fn(async (_item: QueueItem): Promise<void> => undefined);
    const queue = createPendingQueue(processor);
    const unsub = jest.fn();
    let listener: ((state: NetState) => void) | undefined;
    addEventListenerMock.mockReturnValue(unsub as never);
    addEventListenerMock.mockImplementation((cb: unknown) => {
      listener = cb as (state: NetState) => void;
      return unsub;
    });
    fetchMock.mockResolvedValue({ isConnected: false } as never);

    queue.attachOnlineListener();
    queue.attachOnlineListener();
    listener?.({ isConnected: true });
    queue.enqueue({ id: "x" });
    queue.clear();
    queue.detachOnlineListener();

    expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    expect(queue.size()).toBe(0);
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("runs all sync tasks", async () => {
    const taskA = jest.fn(async () => undefined);
    const taskB = jest.fn(async () => undefined);

    await fullSync([taskA, taskB]);

    expect(taskA).toHaveBeenCalledTimes(1);
    expect(taskB).toHaveBeenCalledTimes(1);
  });
});
