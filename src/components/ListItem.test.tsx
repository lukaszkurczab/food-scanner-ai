import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockExecSync = jest.fn<(sql: string) => void>();
const mockGetFirstSync = jest.fn<
  (sql: string) => { user_version: number } | undefined
>();
const mockGetAllSync = jest.fn<(sql: string) => Array<{ name: string }>>();
const mockOpenDatabaseSync = jest.fn<(name: string) => {
  execSync: typeof mockExecSync;
  getFirstSync: typeof mockGetFirstSync;
  getAllSync: typeof mockGetAllSync;
}>((_) => ({
  execSync: mockExecSync,
  getFirstSync: mockGetFirstSync,
  getAllSync: mockGetAllSync,
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: (name: string) => mockOpenDatabaseSync(name),
}));

describe("offline db migrations (src/components/ListItem.tsx)", () => {
  beforeEach(() => {
    jest.resetModules();
    mockExecSync.mockClear();
    mockGetFirstSync.mockClear();
    mockGetAllSync.mockClear();
    mockOpenDatabaseSync.mockClear();
  });

  it("initializes database only once for repeated getDB calls", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 3 });
    const module =
      jest.requireActual<typeof import("@/components/ListItem")>(
        "@/components/ListItem",
      );

    const db1 = module.getDB();
    const db2 = module.getDB();

    expect(db1).toBe(db2);
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA journal_mode = WAL;");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA foreign_keys = ON;");
  });

  it("runs full migration path up to user_version 3 from empty schema", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 0 });
    mockGetAllSync.mockReturnValue([]);
    const module =
      jest.requireActual<typeof import("@/components/ListItem")>(
        "@/components/ListItem",
      );

    module.runMigrations();

    expect(mockExecSync).toHaveBeenCalledWith("BEGIN");
    expect(mockExecSync).toHaveBeenCalledWith("COMMIT");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA user_version = 1;");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA user_version = 2;");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA user_version = 3;");

    const calls = mockExecSync.mock.calls.map((call) => String(call[0]));
    expect(calls.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS meals"))).toBe(true);
    expect(calls.some((sql) => sql.includes("ALTER TABLE meals ADD COLUMN notes"))).toBe(true);
    expect(calls.some((sql) => sql.includes("ALTER TABLE meals ADD COLUMN photo_local_path"))).toBe(true);
  });

  it("skips migration transactions when schema version is already current", () => {
    mockGetFirstSync.mockReturnValue({ user_version: 3 });
    const module =
      jest.requireActual<typeof import("@/components/ListItem")>(
        "@/components/ListItem",
      );

    module.runMigrations();

    const calls = mockExecSync.mock.calls.map((call) => String(call[0]));
    expect(calls.includes("BEGIN")).toBe(false);
    expect(calls.includes("PRAGMA user_version = 3;")).toBe(false);
  });
});
