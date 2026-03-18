import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockExecSync = jest.fn<(sql: string) => void>();
const mockGetFirstSync = jest.fn<
  (sql: string) => { user_version: number } | undefined
>();
const mockGetAllSync = jest.fn<(sql: string) => Array<{ name: string }>>();
const mockOpenDatabaseSync = jest.fn<
  (name: string) => {
    execSync: typeof mockExecSync;
    getFirstSync: typeof mockGetFirstSync;
    getAllSync: typeof mockGetAllSync;
  }
>((_) => ({
  execSync: mockExecSync,
  getFirstSync: mockGetFirstSync,
  getAllSync: mockGetAllSync,
}));

jest.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "file:///mockdb",
  openDatabaseSync: (name: string) => mockOpenDatabaseSync(name),
}));

describe("offline db bootstrap (src/services/offline/db.ts)", () => {
  beforeEach(() => {
    jest.resetModules();
    mockExecSync.mockClear();
    mockGetFirstSync.mockClear();
    mockGetAllSync.mockClear();
    mockOpenDatabaseSync.mockClear();
  });

  it("opens the renamed database and memoizes the connection", () => {
    const module =
      jest.requireActual<typeof import("@/services/offline/db")>(
        "@/services/offline/db",
      );

    const db1 = module.getDB();
    const db2 = module.getDB();

    expect(db1).toBe(db2);
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
    expect(mockOpenDatabaseSync).toHaveBeenCalledWith("fitaly.db");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA journal_mode = WAL;");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA foreign_keys = ON;");
  });

  it("migrates meals and my_meals to v8 by adding input_method and ai_meta", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 7 });
    mockGetAllSync.mockImplementation((sql: string) => {
      if (sql === "PRAGMA table_info(meals)") {
        return [{ name: "cloud_id" }];
      }
      if (sql === "PRAGMA table_info(my_meals)") {
        return [{ name: "cloud_id" }];
      }
      return [];
    });

    const module =
      jest.requireActual<typeof import("@/services/offline/db")>(
        "@/services/offline/db",
      );

    module.runMigrations();

    expect(mockExecSync).toHaveBeenCalledWith(
      "ALTER TABLE meals ADD COLUMN input_method TEXT;",
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      "ALTER TABLE meals ADD COLUMN ai_meta TEXT;",
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      "ALTER TABLE my_meals ADD COLUMN input_method TEXT;",
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      "ALTER TABLE my_meals ADD COLUMN ai_meta TEXT;",
    );
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA user_version = 8;");
  });

  it("skips v8 column adds when schema is already current", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 8 });

    const module =
      jest.requireActual<typeof import("@/services/offline/db")>(
        "@/services/offline/db",
      );

    module.runMigrations();

    const calls = mockExecSync.mock.calls.map(([sql]) => String(sql));
    expect(
      calls.some((sql) => sql.includes("ALTER TABLE meals ADD COLUMN input_method")),
    ).toBe(false);
    expect(
      calls.some((sql) => sql.includes("ALTER TABLE my_meals ADD COLUMN ai_meta")),
    ).toBe(false);
  });
});
