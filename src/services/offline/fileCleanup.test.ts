import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  cleanupTransientOfflineAssets,
  cleanupUserOfflineAssets,
} from "@/services/offline/fileCleanup";

const mockDeleteAsync = jest.fn<
  (path: string, options?: { idempotent?: boolean }) => Promise<void>
>();

jest.mock("@/services/core/fileSystem", () => ({
  documentDirectory: "file:///docs/",
  cacheDirectory: "file:///cache/",
  deleteAsync: (...args: [string, { idempotent?: boolean }?]) =>
    mockDeleteAsync(...args),
}));

describe("cleanupUserOfflineAssets", () => {
  beforeEach(() => {
    mockDeleteAsync.mockReset();
    mockDeleteAsync.mockResolvedValue(undefined);
  });

  it("removes user-scoped offline directories", async () => {
    await cleanupUserOfflineAssets("user-1");

    expect(mockDeleteAsync).toHaveBeenCalledTimes(2);
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///docs/users/user-1", {
      idempotent: true,
    });
    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///docs/meals/user-1", {
      idempotent: true,
    });
  });

  it("skips cleanup when uid is missing", async () => {
    await cleanupUserOfflineAssets(null);

    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it("rejects deletion failures so session reset can log the failed stage", async () => {
    mockDeleteAsync.mockRejectedValueOnce(new Error("boom"));

    await expect(cleanupUserOfflineAssets("user-1")).rejects.toThrow("boom");
    expect(mockDeleteAsync).toHaveBeenCalledTimes(2);
  });

  it("removes transient AI temp cache directory on bootstrap", async () => {
    await cleanupTransientOfflineAssets();

    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///cache/ai", {
      idempotent: true,
    });
  });
});
