import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as ImageManipulator from "expo-image-manipulator";
import { normalizeImageOrientation } from "@/utils/normalizeImageOrientation";

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

const manipulateAsyncMock = ImageManipulator.manipulateAsync as jest.MockedFunction<
  typeof ImageManipulator.manipulateAsync
>;

describe("normalizeImageOrientation", () => {
  beforeEach(() => {
    manipulateAsyncMock.mockReset();
  });

  it("normalizes image orientation with a no-op manipulator pass", async () => {
    manipulateAsyncMock.mockResolvedValue({ uri: "file:///normalized.jpg" } as never);

    await expect(normalizeImageOrientation("file:///raw.jpg")).resolves.toBe(
      "file:///normalized.jpg",
    );
    expect(manipulateAsyncMock).toHaveBeenCalledWith(
      "file:///raw.jpg",
      [],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
  });

  it("falls back to original URI when normalization fails", async () => {
    manipulateAsyncMock.mockRejectedValue(new Error("normalize failed"));

    await expect(normalizeImageOrientation("file:///raw.jpg")).resolves.toBe(
      "file:///raw.jpg",
    );
  });

  it("returns original URI when manipulator returns empty URI", async () => {
    manipulateAsyncMock.mockResolvedValue({ uri: "" } as never);

    await expect(normalizeImageOrientation("file:///raw.jpg")).resolves.toBe(
      "file:///raw.jpg",
    );
  });
});
