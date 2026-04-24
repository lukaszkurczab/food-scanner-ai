import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";

const mockRunSync = jest.fn<(sql: string, params?: unknown[]) => void>();
const mockExecSync = jest.fn<(sql: string) => void>();

jest.mock("@/services/offline/db", () => ({
  getDB: () => ({
    runSync: mockRunSync,
    execSync: mockExecSync,
  }),
}));

jest.mock("@/services/core/events", () => ({
  emit: jest.fn(),
}));

jest.mock("uuid", () => ({
  v4: () => "uuid-generated",
}));

const baseMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  cloudId: "cloud-1",
  timestamp: "2026-02-25T10:00:00.000Z",
  type: "lunch",
  name: "Chicken",
  ingredients: [],
  createdAt: "2026-02-25T10:00:00.000Z",
  updatedAt: "2026-02-25T10:00:00.000Z",
  syncState: "pending",
  source: "manual",
  ...overrides,
});

describe("queue.repo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("coalesces meal upserts by user, cloud id and kind before enqueueing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { enqueueUpsert } = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");

    await enqueueUpsert("user-1", baseMeal());

    expect(mockExecSync).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(mockRunSync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("DELETE FROM op_queue"),
      ["cloud-1", "user-1"],
    );
    expect(mockRunSync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO op_queue"),
      [
        "cloud-1",
        "user-1",
        expect.stringContaining('"cloudId":"cloud-1"'),
        "2026-02-25T10:00:00.000Z",
      ],
    );
    expect(mockExecSync).toHaveBeenNthCalledWith(2, "COMMIT");
  });

  it("coalesces saved-meal upserts by generated document id", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { enqueueMyMealUpsert } = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");

    await enqueueMyMealUpsert(
      "user-1",
      baseMeal({ mealId: undefined as unknown as string, cloudId: undefined }),
    );

    expect(mockRunSync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("DELETE FROM op_queue"),
      ["uuid-generated", "user-1"],
    );
    expect(mockRunSync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO op_queue"),
      [
        "uuid-generated",
        "user-1",
        expect.stringContaining('"source":"manual"'),
        "2026-02-25T10:00:00.000Z",
      ],
    );
  });
});
