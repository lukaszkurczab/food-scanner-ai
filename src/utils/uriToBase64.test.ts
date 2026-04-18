import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as FileSystem from "expo-file-system/legacy";
import { uriToBase64 } from "@/utils/uriToBase64";

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  copyAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: "base64",
  },
}));

const copyAsyncMock = FileSystem.copyAsync as jest.MockedFunction<
  typeof FileSystem.copyAsync
>;
const readAsStringAsyncMock = FileSystem.readAsStringAsync as jest.MockedFunction<
  typeof FileSystem.readAsStringAsync
>;

describe("uriToBase64", () => {
  beforeEach(() => {
    copyAsyncMock.mockReset();
    readAsStringAsyncMock.mockReset();
  });

  it("reads file URI directly without copying", async () => {
    readAsStringAsyncMock.mockResolvedValue("base64-content");

    await expect(uriToBase64("file:///tmp/image.jpg")).resolves.toBe(
      "base64-content",
    );

    expect(copyAsyncMock).not.toHaveBeenCalled();
    expect(readAsStringAsyncMock).toHaveBeenCalledWith("file:///tmp/image.jpg", {
      encoding: "base64",
    });
  });

  it("copies non-file URI into cache before reading", async () => {
    jest.spyOn(Date, "now").mockReturnValue(12345);
    copyAsyncMock.mockResolvedValue(undefined);
    readAsStringAsyncMock.mockResolvedValue("copied-b64");

    await expect(uriToBase64("content://image")).resolves.toBe("copied-b64");

    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "content://image",
      to: "file:///cache/b64-12345.bin",
    });
    expect(readAsStringAsyncMock).toHaveBeenCalledWith("file:///cache/b64-12345.bin", {
      encoding: "base64",
    });
  });

  it("falls back to original URI when copy fails", async () => {
    copyAsyncMock.mockRejectedValue(new Error("copy failed"));
    readAsStringAsyncMock.mockResolvedValue("fallback-b64");

    await expect(uriToBase64("content://image-2")).resolves.toBe("fallback-b64");

    expect(readAsStringAsyncMock).toHaveBeenCalledWith("content://image-2", {
      encoding: "base64",
    });
  });
});
