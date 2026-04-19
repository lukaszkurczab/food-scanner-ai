import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "@/services/core/fileSystem";
import { convertToJpeg } from "@/utils/ensureJpeg";

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: "jpeg",
  },
}));

jest.mock("@/services/core/fileSystem", () => ({
  documentDirectory: "file:///docs/",
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

const manipulateAsyncMock = ImageManipulator.manipulateAsync as jest.MockedFunction<
  typeof ImageManipulator.manipulateAsync
>;
const makeDirectoryAsyncMock = FileSystem.makeDirectoryAsync as jest.MockedFunction<
  typeof FileSystem.makeDirectoryAsync
>;
const copyAsyncMock = FileSystem.copyAsync as jest.MockedFunction<
  typeof FileSystem.copyAsync
>;

describe("convertToJpeg", () => {
  beforeEach(() => {
    manipulateAsyncMock.mockReset();
    makeDirectoryAsyncMock.mockReset();
    copyAsyncMock.mockReset();
  });

  it("returns manipulated URI when no target options are provided", async () => {
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/out.jpg" } as never);

    await expect(convertToJpeg("file:///tmp/in.png")).resolves.toBe(
      "file:///tmp/out.jpg",
    );
    expect(copyAsyncMock).not.toHaveBeenCalled();
  });

  it("copies manipulated image to user target path when options are provided", async () => {
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/out2.jpg" } as never);
    makeDirectoryAsyncMock.mockResolvedValue(undefined as never);
    copyAsyncMock.mockResolvedValue(undefined);

    await expect(
      convertToJpeg("file:///tmp/in2.png", {
        userUid: "user-1",
        fileId: "file-1.jpg",
        dir: "tmp",
      }),
    ).resolves.toBe("file:///docs/users/user-1/tmp/file-1.jpg");

    expect(makeDirectoryAsyncMock).toHaveBeenCalledWith(
      "file:///docs/users/user-1/tmp/",
      { intermediates: true },
    );
    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/out2.jpg",
      to: "file:///docs/users/user-1/tmp/file-1.jpg",
    });
  });

  it("ignores directory creation errors and still copies", async () => {
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///tmp/out3.jpg" } as never);
    makeDirectoryAsyncMock.mockRejectedValue(new Error("exists"));
    copyAsyncMock.mockResolvedValue(undefined);
    jest.spyOn(Date, "now").mockReturnValue(1234);

    await expect(
      convertToJpeg("file:///tmp/in3.png", {
        userUid: "user-2",
      }),
    ).resolves.toBe("file:///docs/users/user-2/images/img-1234.jpg");

    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/out3.jpg",
      to: "file:///docs/users/user-2/images/img-1234.jpg",
    });
  });

  it("returns original URI when manipulation fails", async () => {
    manipulateAsyncMock.mockRejectedValue(new Error("manipulate failed"));

    await expect(convertToJpeg("file:///tmp/in4.png")).resolves.toBe(
      "file:///tmp/in4.png",
    );
  });
});
