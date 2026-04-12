import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Meal } from "@/types/meal";

const mockNetInfoFetch = jest.fn();
const mockEmit = jest.fn();
const mockEnqueueMyMealDelete = jest.fn();
const mockEnqueueMyMealUpsert = jest.fn();
const mockMarkDeletedMyMealLocal = jest.fn();
const mockUpsertMyMealLocalRepo = jest.fn();
const mockPullMyMealChanges = jest.fn();
const mockPushQueue = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: unknown[]) => mockNetInfoFetch(...args) },
}));

jest.mock("@/services/core/events", () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

jest.mock("@/services/offline/queue.repo", () => ({
  enqueueMyMealDelete: (...args: unknown[]) => mockEnqueueMyMealDelete(...args),
  enqueueMyMealUpsert: (...args: unknown[]) => mockEnqueueMyMealUpsert(...args),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  markDeletedMyMealLocal: (...args: unknown[]) =>
    mockMarkDeletedMyMealLocal(...args),
  upsertMyMealLocal: (...args: unknown[]) => mockUpsertMyMealLocalRepo(...args),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  pullMyMealChanges: (...args: unknown[]) => mockPullMyMealChanges(...args),
  pushQueue: (...args: unknown[]) => mockPushQueue(...args),
}));

const baseMeal = (overrides: Partial<Meal> = {}): Meal =>
  ({
    userUid: "user-1",
    mealId: "meal-1",
    cloudId: "meal-1",
    timestamp: "2026-04-12T08:00:00.000Z",
    type: "breakfast",
    name: "Saved meal",
    ingredients: [],
    createdAt: "2026-04-12T08:00:00.000Z",
    updatedAt: "2026-04-12T08:00:00.000Z",
    syncState: "synced",
    source: "saved",
    ...overrides,
  }) as Meal;

describe("services/meals/myMealService", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockEnqueueMyMealDelete.mockResolvedValue(undefined);
    mockEnqueueMyMealUpsert.mockResolvedValue(undefined);
    mockMarkDeletedMyMealLocal.mockResolvedValue(undefined);
    mockUpsertMyMealLocalRepo.mockResolvedValue(undefined);
    mockPullMyMealChanges.mockResolvedValue(undefined);
    mockPushQueue.mockResolvedValue(undefined);
  });

  it("syncs an updated saved meal through the shared sync coordinator", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { upsertMyMealWithPhoto } = require("@/services/meals/myMealService");

    await upsertMyMealWithPhoto("user-1", baseMeal(), "file://meal.jpg");

    expect(mockUpsertMyMealLocalRepo).toHaveBeenCalledWith(
      expect.objectContaining({
        userUid: "user-1",
        cloudId: "meal-1",
        photoLocalPath: "file://meal.jpg",
        uploadState: "pending",
        syncState: "pending",
      }),
    );
    expect(mockEnqueueMyMealUpsert).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith("mymeal:updated", {
      uid: "user-1",
      cloudId: "meal-1",
    });
    expect(mockPushQueue).toHaveBeenCalledTimes(1);
    expect(mockPullMyMealChanges).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent my-meal sync requests into one active run plus one rerun", async () => {
    let releaseFirstPush!: () => void;
    const firstPush = new Promise<void>((resolve) => {
      releaseFirstPush = resolve;
    });
    mockPushQueue
      .mockImplementationOnce(() => firstPush)
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => undefined);
    mockPullMyMealChanges
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { syncMyMeals } = require("@/services/meals/myMealService");

    const p1 = syncMyMeals("user-1");
    const p2 = syncMyMeals("user-1");
    const p3 = syncMyMeals("user-1");

    await Promise.resolve();
    expect(mockPushQueue).toHaveBeenCalledTimes(1);
    expect(mockPullMyMealChanges).toHaveBeenCalledTimes(0);

    releaseFirstPush();
    await Promise.all([p1, p2, p3]);

    expect(mockPushQueue).toHaveBeenCalledTimes(2);
    expect(mockPullMyMealChanges).toHaveBeenCalledTimes(2);
  });
});
