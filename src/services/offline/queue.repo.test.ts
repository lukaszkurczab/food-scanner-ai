import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";

const mockRunSync = jest.fn<(sql: string, params?: unknown[]) => void>();
const mockExecSync = jest.fn<(sql: string) => void>();
const mockGetAllSync = jest.fn<(sql: string, params?: unknown[]) => unknown[]>();
const mockGetFirstSync = jest.fn<
  (sql: string, params?: unknown[]) => { count?: number; dead?: number; pending?: number } | undefined
>();

type QueuedOp = {
  id: number;
  cloudId: string;
  uid: string;
  kind: string;
  payload: unknown;
  updatedAt: string;
  attempts: number;
};

type DeadOp = QueuedOp & {
  failedAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  opId: number;
};

let nextQueueId = 1;
let queuedOps: QueuedOp[] = [];
let deadOps: DeadOp[] = [];

function applyQueueMutation(sql: string, params: unknown[] = []) {
  if (sql.includes("DELETE FROM op_queue_dead")) {
    const ids = new Set((params as number[]).map(Number));
    deadOps = deadOps.filter((op) => !ids.has(op.id));
    return;
  }

  if (sql.includes("DELETE FROM op_queue")) {
    if (sql.includes("WHERE id=?")) {
      const id = Number(params[0]);
      queuedOps = queuedOps.filter((op) => op.id !== id);
      return;
    }

    const [cloudId, uid, ...rest] = params as string[];
    const targetKinds = sql.includes("kind IN")
      ? rest
      : sql.includes("kind=?")
        ? [String(params[2])]
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
      typeof params[2] === "string" && !String(params[2]).startsWith("{")
        ? params[2]
        : sql.includes("'upsert_mymeal'")
          ? "upsert_mymeal"
          : "upsert";
    const payloadIndex = params.length === 5 ? 3 : 2;
    const updatedAtIndex = params.length === 5 ? 4 : 3;
    queuedOps.push({
      id: nextQueueId++,
      cloudId,
      uid,
      kind,
      payload:
        typeof params[payloadIndex] === "string"
          ? JSON.parse(String(params[payloadIndex]))
          : params[payloadIndex],
      updatedAt: String(params[updatedAtIndex]),
      attempts: 0,
    });
  }
}

function selectDeadOps(_sql: string, params: unknown[] = []) {
  const uid = String(params[0] ?? "");
  const limit = Number(params[params.length - 1] ?? deadOps.length);
  const kinds = new Set(
    params
      .slice(1, -1)
      .filter((value): value is string => typeof value === "string"),
  );
  return deadOps
    .filter((op) => op.uid === uid && (!kinds.size || kinds.has(op.kind)))
    .slice(0, limit)
    .map((op) => ({
      id: op.id,
      op_id: op.opId,
      cloud_id: op.cloudId,
      user_uid: op.uid,
      kind: op.kind,
      payload: JSON.stringify(op.payload),
      updated_at: op.updatedAt,
      attempts: op.attempts,
      failed_at: op.failedAt,
      last_error_code: op.lastErrorCode,
      last_error_message: op.lastErrorMessage,
    }));
}

function countFor(
  ops: Array<{ uid: string; kind: string }>,
  uid: string,
  kinds: string[],
) {
  return ops.filter((op) => op.uid === uid && (!kinds.length || kinds.includes(op.kind))).length;
}

function getCounts(sql: string, params: unknown[] = []) {
  const firstUid = String(params[0] ?? "");
  if (sql.includes("COUNT(1) AS count")) {
    const kinds = params
      .slice(1)
      .filter((value): value is string => typeof value === "string");
    return {
      count: countFor(deadOps, firstUid, kinds),
    };
  }

  const midpoint = Math.floor(params.length / 2);
  const firstKinds = params
    .slice(1, midpoint)
    .filter((value): value is string => typeof value === "string");
  const secondUid = String(params[midpoint] ?? "");
  const secondKinds = params
    .slice(midpoint + 1)
    .filter((value): value is string => typeof value === "string");
  return {
    dead: countFor(deadOps, firstUid, firstKinds),
    pending: countFor(queuedOps, secondUid, secondKinds),
  };
}

jest.mock("@/services/offline/db", () => ({
  getDB: () => ({
    runSync: mockRunSync,
    execSync: mockExecSync,
    getAllSync: mockGetAllSync,
    getFirstSync: mockGetFirstSync,
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
    nextQueueId = 1;
    queuedOps = [];
    deadOps = [];
    mockRunSync.mockImplementation(applyQueueMutation);
    mockGetAllSync.mockImplementation(selectDeadOps);
    mockGetFirstSync.mockImplementation(getCounts);
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

  it("keeps one queued meal upsert after repeated offline edits and stores the latest payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { enqueueUpsert, getSyncCounts } = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");

    await enqueueUpsert(
      "user-1",
      baseMeal({
        name: "First offline edit",
        updatedAt: "2026-02-25T10:10:00.000Z",
      }),
    );
    await enqueueUpsert(
      "user-1",
      baseMeal({
        name: "Second offline edit",
        updatedAt: "2026-02-25T10:20:00.000Z",
      }),
    );
    await enqueueUpsert(
      "user-1",
      baseMeal({
        name: "Final offline edit",
        updatedAt: "2026-02-25T10:30:00.000Z",
      }),
    );

    expect(queuedOps).toHaveLength(1);
    expect(queuedOps[0]).toEqual(
      expect.objectContaining({
        cloudId: "cloud-1",
        kind: "upsert",
        updatedAt: "2026-02-25T10:30:00.000Z",
        payload: expect.objectContaining({
          name: "Final offline edit",
          updatedAt: "2026-02-25T10:30:00.000Z",
        }),
      }),
    );
    await expect(
      getSyncCounts("user-1", { kinds: ["upsert", "delete"] }),
    ).resolves.toEqual({ dead: 0, pending: 1 });
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

  it("replaces a pending meal edit with a single delete tombstone", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const queueRepo = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");
    const { enqueueDelete, enqueueUpsert } = queueRepo;

    await enqueueUpsert(
      "user-1",
      baseMeal({
        name: "Edited before delete",
        updatedAt: "2026-02-25T10:30:00.000Z",
      }),
    );
    await enqueueDelete("user-1", "cloud-1", "2026-02-25T11:00:00.000Z");

    expect(queuedOps).toEqual([
      expect.objectContaining({
        cloudId: "cloud-1",
        uid: "user-1",
        kind: "delete",
        updatedAt: "2026-02-25T11:00:00.000Z",
        payload: { cloudId: "cloud-1", deleted: true },
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

  it("surfaces dead meal ops, retries them without duplicate pending ops, and clears after success", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const queueRepo = require("@/services/offline/queue.repo") as
      typeof import("@/services/offline/queue.repo");
    const {
      getDeadLetterCount,
      getDeadLetterOps,
      getSyncCounts,
      markDone,
      retryDeadLetterOps,
    } = queueRepo;

    queuedOps = [
      {
        id: 1,
        cloudId: "cloud-1",
        uid: "user-1",
        kind: "upsert",
        payload: baseMeal(),
        updatedAt: "2026-02-25T10:00:00.000Z",
        attempts: 0,
      },
    ];
    nextQueueId = 2;
    deadOps = [
      {
        id: 10,
        opId: 1,
        cloudId: "cloud-1",
        uid: "user-1",
        kind: "upsert",
        payload: baseMeal({ syncState: "failed" }),
        updatedAt: "2026-02-25T10:00:00.000Z",
        attempts: 10,
        failedAt: "2026-02-25T10:05:00.000Z",
        lastErrorCode: "sync/test",
        lastErrorMessage: "Test failure",
      },
    ];

    await expect(
      getDeadLetterCount("user-1", { kinds: ["upsert", "delete"] }),
    ).resolves.toBe(1);
    await expect(
      getDeadLetterOps({
        uid: "user-1",
        kinds: ["upsert", "delete"],
        limit: 1,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        cloud_id: "cloud-1",
        kind: "upsert",
        payload: expect.objectContaining({ syncState: "failed" }),
      }),
    ]);

    await expect(
      retryDeadLetterOps({ uid: "user-1", kinds: ["upsert", "delete"] }),
    ).resolves.toBe(1);

    expect(queuedOps).toHaveLength(1);
    expect(queuedOps[0]).toEqual(
      expect.objectContaining({
        cloudId: "cloud-1",
        kind: "upsert",
        attempts: 0,
      }),
    );
    await expect(
      getSyncCounts("user-1", { kinds: ["upsert", "delete"] }),
    ).resolves.toEqual({ dead: 0, pending: 1 });

    await markDone(queuedOps[0].id);

    await expect(
      getSyncCounts("user-1", { kinds: ["upsert", "delete"] }),
    ).resolves.toEqual({ dead: 0, pending: 0 });
  });
});
