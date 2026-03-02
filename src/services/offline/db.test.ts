import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockExecSync = jest.fn<(sql: string) => void>();
const mockOpenDatabaseSync = jest.fn<
  (name: string) => {
    execSync: typeof mockExecSync;
  }
>((_) => ({
  execSync: mockExecSync,
}));

jest.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "file:///mockdb",
  openDatabaseSync: (name: string) => mockOpenDatabaseSync(name),
}));

describe("offline db bootstrap (src/services/offline/db.ts)", () => {
  beforeEach(() => {
    jest.resetModules();
    mockExecSync.mockClear();
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
});
