import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MigrationDef = { version: number; up: string };

type DbMock = {
  execAsync: jest.MockedFunction<(sql: string) => Promise<void>>;
  runAsync: jest.MockedFunction<
    (sql: string, params?: unknown[]) => Promise<unknown>
  >;
  getFirstAsync: jest.MockedFunction<
    (
      sql: string,
      params?: unknown[],
    ) => Promise<{ max_v: number | null } | null>
  >;
  withTransactionAsync: jest.MockedFunction<
    (fn: () => Promise<void>) => Promise<void>
  >;
};

function createDbMock(currentVersion: number | null): DbMock {
  const execAsync = jest.fn(async (_sql: string) => {});
  const runAsync = jest.fn(async (_sql: string, _params?: unknown[]) => ({}));
  const getFirstAsync = jest.fn(
    async (_sql: string, _params?: unknown[]) => ({ max_v: currentVersion }),
  );
  const withTransactionAsync = jest.fn(async (fn: () => Promise<void>) => {
    await fn();
  });

  return {
    execAsync,
    runAsync,
    getFirstAsync,
    withTransactionAsync,
  };
}

async function loadRunnerWithMigrations(migrations: MigrationDef[]) {
  jest.resetModules();
  jest.doMock("@/services/offline/migrations", () => ({ migrations }));
  return jest.requireActual<typeof import("@/services/offline/migrationRunner")>(
    "@/services/offline/migrationRunner",
  );
}

describe("offline migrationRunner", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("creates _schema_migrations table", async () => {
    const module = await loadRunnerWithMigrations([]);
    const db = createDbMock(0);

    await module.runMigrations(db as never);

    expect(db.execAsync).toHaveBeenCalledWith(
      "CREATE TABLE IF NOT EXISTS _schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
  });

  it("executes pending migrations in version order", async () => {
    const module = await loadRunnerWithMigrations([
      { version: 3, up: "m3" },
      { version: 1, up: "m1" },
      { version: 2, up: "m2" },
    ]);
    const db = createDbMock(0);

    await module.runMigrations(db as never);

    expect(db.runAsync.mock.calls.map(([, params]) => params?.[0])).toEqual([
      1,
      2,
      3,
    ]);
    expect(db.execAsync.mock.calls.map(([sql]) => sql)).toEqual([
      "CREATE TABLE IF NOT EXISTS _schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("skips already applied migrations", async () => {
    const module = await loadRunnerWithMigrations([
      { version: 1, up: "m1" },
      { version: 2, up: "m2" },
      { version: 3, up: "m3" },
    ]);
    const db = createDbMock(2);

    await module.runMigrations(db as never);

    expect(db.execAsync.mock.calls.map(([sql]) => sql)).toEqual([
      "CREATE TABLE IF NOT EXISTS _schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
      "m3",
    ]);
    expect(db.runAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      "INSERT INTO _schema_migrations (version, applied_at) VALUES (?, datetime('now'))",
      [3],
    );
  });

  it("runs each migration inside its own transaction", async () => {
    const module = await loadRunnerWithMigrations([
      { version: 1, up: "m1" },
      { version: 2, up: "m2" },
    ]);
    const db = createDbMock(0);

    await module.runMigrations(db as never);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(2);
  });
});
