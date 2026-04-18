import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { getSampleMealUri, getSampleTableUri } from "@/utils/devSamples";

jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn(),
  },
}));

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  copyAsync: jest.fn(),
}));

const fromModuleMock = Asset.fromModule as jest.MockedFunction<typeof Asset.fromModule>;
const copyAsyncMock = FileSystem.copyAsync as jest.MockedFunction<
  typeof FileSystem.copyAsync
>;

describe("devSamples", () => {
  beforeEach(() => {
    fromModuleMock.mockReset();
    copyAsyncMock.mockReset();
  });

  it("downloads asset and returns existing file:// local URI", async () => {
    const downloadAsync = jest.fn(async () => undefined);
    fromModuleMock.mockReturnValue({
      downloaded: false,
      downloadAsync,
      localUri: "file:///sampleMeal-local.jpg",
      uri: "https://example.com/sampleMeal.jpg",
    } as never);

    await expect(getSampleMealUri()).resolves.toBe("file:///sampleMeal-local.jpg");
    expect(downloadAsync).toHaveBeenCalled();
    expect(copyAsyncMock).not.toHaveBeenCalled();
  });

  it("copies non-file URI into cache and returns cache path", async () => {
    fromModuleMock.mockReturnValue({
      downloaded: true,
      downloadAsync: jest.fn(async () => undefined),
      localUri: undefined,
      uri: "https://example.com/sampleTable.jpg",
    } as never);
    copyAsyncMock.mockResolvedValue(undefined);

    await expect(getSampleTableUri()).resolves.toBe("file:///cache/sampleTable.jpg");
    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "https://example.com/sampleTable.jpg",
      to: "file:///cache/sampleTable.jpg",
    });
  });
});
