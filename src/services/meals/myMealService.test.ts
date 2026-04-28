import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Meal } from "@/types/meal";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockEmit = jest.fn<(eventName: string, payload?: unknown) => void>();
const mockEnqueueMyMealDelete = jest.fn<
  (uid: string, cloudId: string, deletedAtISO: string) => Promise<void>
>();
const mockEnqueueMyMealUpsert = jest.fn<
  (uid: string, meal: Meal) => Promise<void>
>();
const mockMarkDeletedMyMealLocal = jest.fn<
  (cloudId: string, deletedAtISO: string) => Promise<void>
>();
const mockUpsertMyMealLocalRepo = jest.fn<(meal: Meal) => Promise<void>>();
const mockRequestSync = jest.fn<
  (params: { uid: string; domain: string; reason: string }) => Promise<void>
>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: () => mockNetInfoFetch() },
}));

jest.mock("@/services/core/events", () => ({
  emit: (eventName: string, payload?: unknown) => mockEmit(eventName, payload),
}));

jest.mock("@/services/offline/queue.repo", () => ({
  enqueueMyMealDelete: (uid: string, cloudId: string, deletedAtISO: string) =>
    mockEnqueueMyMealDelete(uid, cloudId, deletedAtISO),
  enqueueMyMealUpsert: (uid: string, meal: Meal) =>
    mockEnqueueMyMealUpsert(uid, meal),
}));

jest.mock("@/services/offline/myMeals.repo", () => ({
  markDeletedMyMealLocal: (cloudId: string, deletedAtISO: string) =>
    mockMarkDeletedMyMealLocal(cloudId, deletedAtISO),
  upsertMyMealLocal: (meal: Meal) => mockUpsertMyMealLocalRepo(meal),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  requestSync: (params: { uid: string; domain: string; reason: string }) =>
    mockRequestSync(params),
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
    mockRequestSync.mockResolvedValue(undefined);
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
    expect(mockRequestSync).toHaveBeenCalledWith({
      uid: "user-1",
      domain: "myMeals",
      reason: "local-change",
    });
  });

  it("delegates explicit saved-meal sync to the shared coordinator", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { syncMyMeals } = require("@/services/meals/myMealService");

    await syncMyMeals("user-1");

    expect(mockRequestSync).toHaveBeenCalledWith({
      uid: "user-1",
      domain: "myMeals",
      reason: "local-change",
    });
  });
});
