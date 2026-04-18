import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as FileSystem from "expo-file-system/legacy";
import { deletePhotoLocally, savePhotoLocally } from "@/utils/savePhotoLocally";

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///docs/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

const getInfoAsyncMock = FileSystem.getInfoAsync as jest.MockedFunction<
  typeof FileSystem.getInfoAsync
>;
const makeDirectoryAsyncMock = FileSystem.makeDirectoryAsync as jest.MockedFunction<
  typeof FileSystem.makeDirectoryAsync
>;
const deleteAsyncMock = FileSystem.deleteAsync as jest.MockedFunction<
  typeof FileSystem.deleteAsync
>;
const copyAsyncMock = FileSystem.copyAsync as jest.MockedFunction<
  typeof FileSystem.copyAsync
>;

describe("savePhotoLocally", () => {
  beforeEach(() => {
    getInfoAsyncMock.mockReset();
    makeDirectoryAsyncMock.mockReset();
    deleteAsyncMock.mockReset();
    copyAsyncMock.mockReset();
  });

  it("creates target directory and copies file", async () => {
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: false } as never)
      .mockResolvedValueOnce({ exists: false } as never);
    makeDirectoryAsyncMock.mockResolvedValue(undefined as never);
    copyAsyncMock.mockResolvedValue(undefined);

    await expect(
      savePhotoLocally({
        userUid: "user-1",
        fileId: "img-1",
        photoUri: "file:///tmp/input.jpg",
      }),
    ).resolves.toBe("file:///docs/users/user-1/images/img-1.jpg");

    expect(makeDirectoryAsyncMock).toHaveBeenCalledWith(
      "file:///docs/users/user-1/images/",
      { intermediates: true },
    );
    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/input.jpg",
      to: "file:///docs/users/user-1/images/img-1.jpg",
    });
  });

  it("deletes stale file before copying when destination exists", async () => {
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: true } as never)
      .mockResolvedValueOnce({ exists: true } as never);
    deleteAsyncMock.mockResolvedValue(undefined as never);
    copyAsyncMock.mockResolvedValue(undefined);

    await savePhotoLocally({
      userUid: "user-1",
      fileId: "img-2",
      photoUri: "file:///tmp/input2.jpg",
      dir: "tmp",
    });

    expect(deleteAsyncMock).toHaveBeenCalledWith(
      "file:///docs/users/user-1/tmp/img-2.jpg",
      { idempotent: true },
    );
    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/input2.jpg",
      to: "file:///docs/users/user-1/tmp/img-2.jpg",
    });
  });

  it("ignores stale-file cleanup errors and still copies", async () => {
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: true } as never)
      .mockRejectedValueOnce(new Error("stale check failed"));
    copyAsyncMock.mockResolvedValue(undefined);

    await savePhotoLocally({
      userUid: "user-2",
      fileId: "img-3",
      photoUri: "file:///tmp/input3.jpg",
    });

    expect(copyAsyncMock).toHaveBeenCalledWith({
      from: "file:///tmp/input3.jpg",
      to: "file:///docs/users/user-2/images/img-3.jpg",
    });
  });
});

describe("deletePhotoLocally", () => {
  beforeEach(() => {
    getInfoAsyncMock.mockReset();
    deleteAsyncMock.mockReset();
  });

  it("deletes file when it exists", async () => {
    getInfoAsyncMock.mockResolvedValue({ exists: true } as never);
    deleteAsyncMock.mockResolvedValue(undefined as never);

    await deletePhotoLocally({ userUid: "user-1", fileId: "img-4" });

    expect(deleteAsyncMock).toHaveBeenCalledWith(
      "file:///docs/users/user-1/images/img-4.jpg",
      { idempotent: true },
    );
  });

  it("does nothing when file does not exist or lookup fails", async () => {
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: false } as never)
      .mockRejectedValueOnce(new Error("lookup failed"));

    await deletePhotoLocally({ userUid: "user-1", fileId: "img-5" });
    await deletePhotoLocally({ userUid: "user-1", fileId: "img-6", dir: "tmp" });

    expect(deleteAsyncMock).not.toHaveBeenCalled();
  });
});
