import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { SyncStrategy } from "@/services/offline/sync.strategy";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockNextBatch = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockMarkDone = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockBumpAttempts = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMoveToDeadLetter = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetMealSyncStateLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSetMyMealSyncStateLocal = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockEmit = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("@/services/offline/queue.repo", () => ({
  nextBatch: (...args: unknown[]) => mockNextBatch(...args),
  markDone: (...args: unknown[]) => mockMarkDone(...args),
  bumpAttempts: (...args: unknown[]) => mockBumpAttempts(...args),
  moveToDeadLetter: (...args: unknown[]) => mockMoveToDeadLetter(...args),
  MAX_QUEUE_ATTEMPTS: 10,
}));

jest.mock("@/services/offline/meals.repo", () => ({
  setMealSyncStateLocal: (...args: unknown[]) => mockSetMealSyncStateLocal(...args),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  setMyMealSyncStateLocal: (...args: unknown[]) => mockSetMyMealSyncStateLocal(...args),
}));

jest.mock("@/services/core/events", () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

describe("sync.push", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockNextBatch.mockReset();
    mockMarkDone.mockResolvedValue();
    mockBumpAttempts.mockResolvedValue();
    mockMoveToDeadLetter.mockResolvedValue();
    mockSetMealSyncStateLocal.mockResolvedValue();
    mockSetMyMealSyncStateLocal.mockResolvedValue();
  });

  it("marks unknown ops done to avoid infinite retries", async () => {
    mockNextBatch
      .mockResolvedValueOnce([
        {
          id: 1,
          cloud_id: "x-1",
          user_uid: "user-1",
          kind: "unknown_kind",
          payload: {},
          updated_at: "2026-03-03T12:00:00.000Z",
          attempts: 0,
        },
      ])
      .mockResolvedValueOnce([]);

    const strategy: SyncStrategy = {
      pull: async () => 0,
      handlePushOp: async () => false,
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runPushQueue } = require("@/services/offline/sync.push");

    await runPushQueue("user-1", 25, [strategy]);

    expect(mockMarkDone).toHaveBeenCalledWith(1);
    expect(mockBumpAttempts).not.toHaveBeenCalled();
    expect(mockMoveToDeadLetter).not.toHaveBeenCalled();
  });

  it("moves poisoned ops to dead letter after max retries", async () => {
    mockNextBatch
      .mockResolvedValueOnce([
        {
          id: 99,
          cloud_id: "meal-99",
          user_uid: "user-1",
          kind: "upsert",
          payload: {},
          updated_at: "2026-03-03T12:00:00.000Z",
          attempts: 9,
        },
      ])
      .mockResolvedValueOnce([]);

    const strategy: SyncStrategy = {
      pull: async () => 0,
      handlePushOp: async () => {
        throw new Error("invalid payload");
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { runPushQueue } = require("@/services/offline/sync.push");

    await runPushQueue("user-1", 25, [strategy]);

    expect(mockMoveToDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99, kind: "upsert", attempts: 9 }),
      10,
      expect.objectContaining({ code: "sync/unknown" }),
    );
    expect(mockSetMealSyncStateLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        cloudId: "meal-99",
        syncState: "failed",
      }),
    );
    expect(mockMarkDone).not.toHaveBeenCalledWith(99);
  });
});
