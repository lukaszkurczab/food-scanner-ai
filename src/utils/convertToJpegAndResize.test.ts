import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Image } from "react-native";
import { convertToJpegAndResize } from "@/utils/convertToJpegAndResize";

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: "jpeg",
  },
}));

jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///docs/",
  copyAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
}));

const manipulateAsyncMock = ImageManipulator.manipulateAsync as jest.MockedFunction<
  typeof ImageManipulator.manipulateAsync
>;
const copyAsyncMock = FileSystem.copyAsync as jest.MockedFunction<
  typeof FileSystem.copyAsync
>;
const getInfoAsyncMock = FileSystem.getInfoAsync as jest.MockedFunction<
  typeof FileSystem.getInfoAsync
>;
const makeDirectoryAsyncMock = FileSystem.makeDirectoryAsync as jest.MockedFunction<
  typeof FileSystem.makeDirectoryAsync
>;

describe("convertToJpegAndResize", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    manipulateAsyncMock.mockReset();
    copyAsyncMock.mockReset();
    getInfoAsyncMock.mockReset();
    makeDirectoryAsyncMock.mockReset();
  });

  it("copies non-file URI to cache, resizes image and returns manipulated URI", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1234);
    copyAsyncMock.mockResolvedValue(undefined);
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(3200, 1200),
      );
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/resized.jpg" } as never);

    await expect(
      convertToJpegAndResize("content://image-1", 1600, 1600),
    ).resolves.toBe("file:///tmp/resized.jpg");

    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "content://image-1",
      to: "file:///cache/res-1234.jpg",
    });
    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      "file:///cache/res-1234.jpg",
      [{ resize: { width: 1600, height: 600 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
  });

  it("falls back to original URI when non-file copy fails", async () => {
    copyAsyncMock.mockRejectedValue(new Error("copy failed"));
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(800, 600),
      );
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/no-resize.jpg" } as never);

    await convertToJpegAndResize("content://image-2", 1600, 1600);

    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      "content://image-2",
      [{ resize: { width: 800, height: 600 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
  });

  it("copies manipulated file to target path when options are provided", async () => {
    jest.spyOn(Date, "now").mockReturnValue(999);
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(1000, 1000),
      );
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/final.jpg" } as never);
    makeDirectoryAsyncMock.mockRejectedValue(new Error("exists"));
    copyAsyncMock.mockResolvedValue(undefined);

    await expect(
      convertToJpegAndResize(
        "file:///tmp/input.jpg",
        1600,
        1600,
        { userUid: "user-1", dir: "tmp" },
        { grayscale: true, threshold: 100 },
      ),
    ).resolves.toBe("file:///docs/users/user-1/tmp/img-999.jpg");

    expect(makeDirectoryAsyncMock).toHaveBeenCalledWith(
      "file:///docs/users/user-1/tmp/",
      { intermediates: true },
    );
    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/final.jpg",
      to: "file:///docs/users/user-1/tmp/img-999.jpg",
    });
  });

  it("covers default max dimensions and default images directory for target path", async () => {
    jest.spyOn(Date, "now").mockReturnValue(777);
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(1200, 800),
      );
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/default.jpg" } as never);
    makeDirectoryAsyncMock.mockResolvedValue(undefined as never);
    copyAsyncMock.mockResolvedValue(undefined);

    await expect(
      convertToJpegAndResize(
        "file:///tmp/default-input.jpg",
        undefined,
        undefined,
        { userUid: "user-2" },
      ),
    ).resolves.toBe("file:///docs/users/user-2/images/img-777.jpg");

    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      "file:///tmp/default-input.jpg",
      [{ resize: { width: 1200, height: 800 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/default.jpg",
      to: "file:///docs/users/user-2/images/img-777.jpg",
    });
  });

  it("does not run fallback compression when output is already under maxBytes", async () => {
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(2000, 1000),
      );
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/initial.jpg" } as never);
    getInfoAsyncMock.mockResolvedValue({
      exists: true,
      size: 900_000,
    } as never);

    await expect(
      convertToJpegAndResize(
        "file:///tmp/input.jpg",
        1600,
        1600,
        undefined,
        undefined,
        1_000_000,
      ),
    ).resolves.toBe("file:///tmp/initial.jpg");

    expect(manipulateAsyncMock).toHaveBeenCalledTimes(1);
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      1,
      "file:///tmp/input.jpg",
      [{ resize: { width: 1600, height: 800 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(getInfoAsyncMock).toHaveBeenCalledTimes(1);
    expect(getInfoAsyncMock).toHaveBeenCalledWith("file:///tmp/initial.jpg", { size: true });
  });

  it("tries fallback compression steps in order when output exceeds maxBytes", async () => {
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(4000, 2000),
      );
    manipulateAsyncMock
      .mockResolvedValueOnce({ uri: "file:///tmp/step-0.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-1.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-2.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-3.jpg" } as never);
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: true, size: 5_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 4_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 3_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 2_000_000 } as never);

    await expect(
      convertToJpegAndResize(
        "file:///tmp/input.jpg",
        1600,
        1600,
        undefined,
        undefined,
        2_500_000,
      ),
    ).resolves.toBe("file:///tmp/step-3.jpg");

    expect(manipulateAsyncMock).toHaveBeenCalledTimes(4);
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      1,
      "file:///tmp/input.jpg",
      [{ resize: { width: 1600, height: 800 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      2,
      "file:///tmp/input.jpg",
      [{ resize: { width: 1600, height: 800 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      3,
      "file:///tmp/input.jpg",
      [{ resize: { width: 1600, height: 800 } }],
      { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      4,
      "file:///tmp/input.jpg",
      [{ resize: { width: 1200, height: 600 } }],
      { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(getInfoAsyncMock).toHaveBeenCalledTimes(4);
    expect(getInfoAsyncMock).toHaveBeenNthCalledWith(1, "file:///tmp/step-0.jpg", {
      size: true,
    });
    expect(getInfoAsyncMock).toHaveBeenNthCalledWith(2, "file:///tmp/step-1.jpg", {
      size: true,
    });
    expect(getInfoAsyncMock).toHaveBeenNthCalledWith(3, "file:///tmp/step-2.jpg", {
      size: true,
    });
    expect(getInfoAsyncMock).toHaveBeenNthCalledWith(4, "file:///tmp/step-3.jpg", {
      size: true,
    });
  });

  it("returns best available image when all fallback outputs still exceed maxBytes", async () => {
    jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) =>
        (success as (w: number, h: number) => void)(6000, 3000),
      );
    manipulateAsyncMock
      .mockResolvedValueOnce({ uri: "file:///tmp/step-0.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-1.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-2.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-3.jpg" } as never)
      .mockResolvedValueOnce({ uri: "file:///tmp/step-4.jpg" } as never);
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: true, size: 8_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 7_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 6_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 5_000_000 } as never)
      .mockResolvedValueOnce({ exists: true, size: 4_000_000 } as never);

    await expect(
      convertToJpegAndResize(
        "file:///tmp/input.jpg",
        1600,
        1600,
        undefined,
        undefined,
        2_500_000,
      ),
    ).resolves.toBe("file:///tmp/step-4.jpg");

    expect(manipulateAsyncMock).toHaveBeenCalledTimes(5);
    expect(manipulateAsyncMock).toHaveBeenNthCalledWith(
      5,
      "file:///tmp/input.jpg",
      [{ resize: { width: 800, height: 400 } }],
      { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG },
    );
    expect(getInfoAsyncMock).toHaveBeenCalledTimes(5);
  });
});
