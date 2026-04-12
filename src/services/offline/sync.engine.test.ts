import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockAddEventListener = jest.fn<(listener: (state: { isConnected: boolean }) => void) => () => void>();
const mockRunPushQueue = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockMealsPull = jest.fn<(...args: unknown[]) => Promise<number>>();
const mockMyMealsPull = jest.fn<(...args: unknown[]) => Promise<number>>();
const mockChatPull = jest.fn<(...args: unknown[]) => Promise<number>>();
const mockProcessImageUploads = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: (...args: []) => mockNetInfoFetch(...args),
    addEventListener: (...args: [(state: { isConnected: boolean }) => void]) =>
      mockAddEventListener(...args),
  },
}));

jest.mock("./sync.push", () => ({
  runPushQueue: (...args: unknown[]) => mockRunPushQueue(...args),
}));

jest.mock("./strategies/meals.strategy", () => ({
  mealsStrategy: {
    pull: (...args: unknown[]) => mockMealsPull(...args),
    handlePushOp: jest.fn(async () => false),
  },
}));

jest.mock("./strategies/myMeals.strategy", () => ({
  myMealsStrategy: {
    pull: (...args: unknown[]) => mockMyMealsPull(...args),
    handlePushOp: jest.fn(async () => false),
  },
}));

jest.mock("./strategies/chat.strategy", () => ({
  chatStrategy: {
    pull: (...args: unknown[]) => mockChatPull(...args),
    handlePushOp: jest.fn(async () => false),
  },
}));

jest.mock("./strategies/userProfile.strategy", () => ({
  userProfileStrategy: {
    pull: jest.fn(async () => 0),
    handlePushOp: jest.fn(async () => false),
  },
}));

jest.mock("./strategies/images.strategy", () => ({
  imagesStrategy: {
    pull: jest.fn(async () => 0),
    handlePushOp: jest.fn(async () => false),
  },
  processImageUploads: (...args: unknown[]) => mockProcessImageUploads(...args),
}));

describe("offline sync.engine integration", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockAddEventListener.mockReset();
    mockRunPushQueue.mockResolvedValue();
    mockMealsPull.mockResolvedValue(0);
    mockMyMealsPull.mockResolvedValue(0);
    mockChatPull.mockResolvedValue(0);
    mockProcessImageUploads.mockResolvedValue();
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as never);
    jest.spyOn(global, "clearInterval").mockImplementation(() => {});
  });

  it("starts and stops sync loop with timer and network subscription", () => {
    const unsub = jest.fn();
    mockAddEventListener.mockReturnValue(unsub);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startSyncLoop, stopSyncLoop, getSyncStatus } = require("@/services/offline/sync.engine");

    startSyncLoop("user-1");
    expect(getSyncStatus()).toEqual({ running: false, hasTimer: true });

    stopSyncLoop();
    expect(unsub).toHaveBeenCalledTimes(1);
    expect(clearInterval).toHaveBeenCalledTimes(1);
    expect(getSyncStatus()).toEqual({ running: false, hasTimer: false });
  });

  it("runs loop work in order: images -> push -> meals -> myMeals -> chat", async () => {
    const order: string[] = [];
    mockAddEventListener.mockReturnValue(jest.fn());
    mockProcessImageUploads.mockImplementation(async () => {
      order.push("images");
    });
    mockRunPushQueue.mockImplementation(async () => {
      order.push("push");
    });
    mockMealsPull.mockImplementation(async () => {
      order.push("meals");
      return 1;
    });
    mockMyMealsPull.mockImplementation(async () => {
      order.push("myMeals");
      return 1;
    });
    mockChatPull.mockImplementation(async () => {
      order.push("chat");
      return 1;
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startSyncLoop, stopSyncLoop } = require("@/services/offline/sync.engine");

    startSyncLoop("user-1");
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(order).toEqual(["images", "push", "meals", "myMeals", "chat"]);
    stopSyncLoop();
  });

  it("continues later sync phases when an earlier phase fails", async () => {
    const order: string[] = [];
    mockAddEventListener.mockReturnValue(jest.fn());
    mockProcessImageUploads.mockImplementation(async () => {
      order.push("images");
      throw new Error("upload failed");
    });
    mockRunPushQueue.mockImplementation(async () => {
      order.push("push");
    });
    mockMealsPull.mockImplementation(async () => {
      order.push("meals");
      return 1;
    });
    mockMyMealsPull.mockImplementation(async () => {
      order.push("myMeals");
      return 1;
    });
    mockChatPull.mockImplementation(async () => {
      order.push("chat");
      return 1;
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startSyncLoop, stopSyncLoop } = require("@/services/offline/sync.engine");

    startSyncLoop("user-1");
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(order).toEqual(["images", "push", "meals", "myMeals", "chat"]);
    stopSyncLoop();
  });

  it("serializes pushQueue calls per uid using the internal lock", async () => {
    let releaseFirst!: () => void;
    const firstCall = new Promise<void>((resolve) => {
      releaseFirst = () => resolve();
    });
    mockRunPushQueue
      .mockImplementationOnce(() => firstCall)
      .mockImplementationOnce(async () => {});

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pushQueue } = require("@/services/offline/sync.engine");

    const p1 = pushQueue("user-1");
    const p2 = pushQueue("user-1");

    await new Promise((resolve) => setImmediate(resolve));
    expect(mockRunPushQueue).toHaveBeenCalledTimes(1);

    releaseFirst();
    await p1;
    await p2;

    expect(mockRunPushQueue).toHaveBeenCalledTimes(2);
  });

  it("coalesces duplicate chat pull requests for the same uid", async () => {
    let releasePull!: () => void;
    const firstPull = new Promise<number>((resolve) => {
      releasePull = () => resolve(1);
    });
    mockChatPull
      .mockImplementationOnce(() => firstPull)
      .mockImplementationOnce(async () => 1);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pullChatChanges } = require("@/services/offline/sync.engine");

    const p1 = pullChatChanges("user-1");
    const p2 = pullChatChanges("user-1");

    await new Promise((resolve) => setImmediate(resolve));
    expect(mockChatPull).toHaveBeenCalledTimes(1);

    releasePull();
    await p1;
    await p2;

    expect(mockChatPull).toHaveBeenCalledTimes(1);

    await pullChatChanges("user-1");
    expect(mockChatPull).toHaveBeenCalledTimes(2);
  });
});
