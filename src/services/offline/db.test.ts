import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockExecSync = jest.fn<(sql: string) => void>();
const mockCloseSync = jest.fn<() => void>();
const mockOpenDatabaseSync = jest.fn<
  (name: string) => {
    execSync: typeof mockExecSync;
    closeSync: typeof mockCloseSync;
  }
>((_) => ({
  execSync: mockExecSync,
  closeSync: mockCloseSync,
}));

const existingFiles = new Set<string>();

class MockFile {
  readonly uri: string;

  constructor(...uris: string[]) {
    const [first = "", ...rest] = uris;
    this.uri = [
      first.replace(/\/+$/g, ""),
      ...rest.map((segment) => segment.replace(/^\/+|\/+$/g, "")),
    ].join("/");
  }

  get exists(): boolean {
    return existingFiles.has(this.uri);
  }

  copy(destination: MockFile): void {
    existingFiles.add(destination.uri);
  }

  delete(): void {
    existingFiles.delete(this.uri);
  }
}

jest.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "file:///mockdb",
  openDatabaseSync: (name: string) => mockOpenDatabaseSync(name),
}));

jest.mock("expo-file-system/next", () => ({
  File: MockFile,
}));

describe("offline db bootstrap (src/services/offline/db.ts)", () => {
  beforeEach(() => {
    jest.resetModules();
    mockExecSync.mockClear();
    mockCloseSync.mockClear();
    mockOpenDatabaseSync.mockClear();
    existingFiles.clear();
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

  it("copies the legacy database before opening the renamed database", () => {
    existingFiles.add("file:///mockdb/caloriai.db");

    const module =
      jest.requireActual<typeof import("@/services/offline/db")>(
        "@/services/offline/db",
      );

    module.getDB();

    expect(mockOpenDatabaseSync).toHaveBeenNthCalledWith(1, "caloriai.db");
    expect(mockOpenDatabaseSync).toHaveBeenNthCalledWith(2, "fitaly.db");
    expect(mockExecSync).toHaveBeenCalledWith("PRAGMA wal_checkpoint(TRUNCATE);");
    expect(mockCloseSync).toHaveBeenCalledTimes(1);
    expect(existingFiles.has("file:///mockdb/fitaly.db")).toBe(true);
  });
});
