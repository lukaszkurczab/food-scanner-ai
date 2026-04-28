import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";

const mockRunSync = jest.fn<(sql: string, params?: unknown[]) => void>();
const mockExecSync = jest.fn<(sql: string) => void>();

type QueuedOp = {
  cloudId: string;
  uid: string;
  kind: string;
  payload: unknown;
  updatedAt: string;
};

let queuedOps: QueuedOp[] = [];

function applyQueueMutation(sql: string, params: unknown[] = []) {
  if (sql.includes("DELETE FROM op_queue")) {
    const [cloudId, uid, ...kinds] = params as string[];
    const targetKinds = sql.includes("kind IN")
      ? kinds
      : [
          sql.includes("kind='upsert_mymeal'")
            ? "upsert_mymeal"
            : "upsert",
        ];
    queuedOps = queuedOps.filter(
      (op) =>
        !(
          op.cloudId === cloudId &&
          op.uid === uid &&
          targetKinds.includes(op.kind)
        ),
    );
    return;
  }

  if (sql.includes("INSERT INTO op_queue")) {
    const [cloudId, uid] = params as string[];
    const kind =
      typeof params[2] === "string" &&
      ["delete", "delete_mymeal"].includes(params[2])
        ? params[2]
        : sql.includes("'upsert_mymeal'")
          ? "upsert_mymeal"
          : "upsert";
    const payloadIndex = params.length === 5 ? 3 : 2;
    const updatedAtIndex = params.length === 5 ? 4 : 3;
    queuedOps.push({
      cloudId,
      uid,
      kind,
      payload: JSON.parse(String(params[payloadIndex])),
      updatedAt: String(params[updatedAtIndex]),
    });
  }
}

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
    queuedOps = [];
    mockRunSync.mockImplementation(applyQueueMutation);
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

  it("coalesces repeated meal deletes into a single pending op", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { enqueueDelete } = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");

    await enqueueDelete("user-1", "cloud-1", "2026-02-25T10:00:00.000Z");
    await enqueueDelete("user-1", "cloud-1", "2026-02-25T11:00:00.000Z");

    expect(queuedOps).toEqual([
      expect.objectContaining({
        cloudId: "cloud-1",
        uid: "user-1",
        kind: "delete",
        updatedAt: "2026-02-25T11:00:00.000Z",
      }),
    ]);
    expect(mockExecSync.mock.calls.map(([sql]) => sql)).toEqual([
      "BEGIN",
      "COMMIT",
      "BEGIN",
      "COMMIT",
    ]);
  });

  it("replaces a pending meal upsert with a single delete", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const queueRepo = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");
    const { enqueueDelete, enqueueUpsert } = queueRepo;

    await enqueueUpsert("user-1", baseMeal());
    await enqueueDelete("user-1", "cloud-1", "2026-02-25T11:00:00.000Z");

    expect(queuedOps).toEqual([
      expect.objectContaining({
        cloudId: "cloud-1",
        uid: "user-1",
        kind: "delete",
        updatedAt: "2026-02-25T11:00:00.000Z",
      }),
    ]);
  });

  it("replaces pending saved-meal upserts and deletes with one saved-meal delete", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const queueRepo = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");
    const { enqueueMyMealDelete, enqueueMyMealUpsert } = queueRepo;

    await enqueueMyMealUpsert("user-1", baseMeal());
    await enqueueMyMealDelete("user-1", "meal-1", "2026-02-25T11:00:00.000Z");
    await enqueueMyMealDelete("user-1", "meal-1", "2026-02-25T12:00:00.000Z");

    expect(queuedOps).toEqual([
      expect.objectContaining({
        cloudId: "meal-1",
        uid: "user-1",
        kind: "delete_mymeal",
        updatedAt: "2026-02-25T12:00:00.000Z",
      }),
    ]);
  });
});
