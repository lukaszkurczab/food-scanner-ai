import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  ensureLocalMealPhoto,
  processAndUpload,
} from "@/services/meals/mealService.images";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockManipulateAsync = jest.fn<(...args: unknown[]) => Promise<{ uri: string }>>();
const mockGetInfoAsync = jest.fn<(...args: unknown[]) => Promise<{ exists: boolean }>>();
const mockMakeDirectoryAsync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockCopyAsync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteAsync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDownloadAsync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpload = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUuid = jest.fn<() => string>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: (...args: []) => mockNetInfoFetch(...args),
  },
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///docs/",
  cacheDirectory: "file:///cache/",
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
}));

jest.mock("@/services/core/apiClient", () => ({
  upload: (...args: unknown[]) => mockUpload(...args),
  get: (...args: unknown[]) => mockGet(...args),
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

describe("services/mealService.images", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockManipulateAsync
      .mockResolvedValueOnce({ uri: "file:///cloud.jpg" })
      .mockResolvedValueOnce({ uri: "file:///ai.jpg" });
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockMakeDirectoryAsync.mockResolvedValue();
    mockCopyAsync.mockResolvedValue();
    mockDeleteAsync.mockResolvedValue();
    mockDownloadAsync.mockResolvedValue();
    mockUpload.mockResolvedValue({
      imageId: "image-1",
      photoUrl: "https://cdn/meal.jpg",
    });
    mockGet.mockResolvedValue({
      imageId: "image-1",
      photoUrl: "https://cdn/meal.jpg",
    });
    mockUuid.mockReturnValue("uuid-1");
  });

  it("uploads compressed meal photo through backend", async () => {
    const result = await processAndUpload("user-1", "file:///raw.jpg");

    expect(mockUpload).toHaveBeenCalledWith(
      "/users/me/meals/photo",
      expect.any(FormData),
    );
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: "file:///ai.jpg",
      to: "file:///cache/ai/uuid-1.jpg",
    });
    expect(mockDeleteAsync).toHaveBeenNthCalledWith(1, "file:///cloud.jpg", {
      idempotent: true,
    });
    expect(mockDeleteAsync).toHaveBeenNthCalledWith(2, "file:///ai.jpg", {
      idempotent: true,
    });
    expect(result).toEqual({
      imageId: "image-1",
      cloudUrl: "https://cdn/meal.jpg",
      aiLocalUri: "file:///cache/ai/uuid-1.jpg",
    });
  });

  it("does not delete the source image when manipulator returns original URI", async () => {
    mockManipulateAsync
      .mockResolvedValueOnce({ uri: "file:///raw.jpg" })
      .mockResolvedValueOnce({ uri: "file:///raw.jpg" });

    await processAndUpload("user-1", "file:///raw.jpg");

    expect(mockDeleteAsync).not.toHaveBeenCalledWith("file:///raw.jpg", {
      idempotent: true,
    });
  });

  it("resolves missing local meal photo through backend and downloads it", async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: true });

    const result = await ensureLocalMealPhoto({
      uid: "user-1",
      cloudId: "meal-1",
      imageId: "image-1",
      photoUrl: null,
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/users/me/meals/photo-url?mealId=meal-1&imageId=image-1",
    );
    expect(mockDownloadAsync).toHaveBeenCalledWith(
      "https://cdn/meal.jpg",
      "file:///docs/meals/user-1/meal-1.jpg",
    );
    expect(result).toBe("file:///docs/meals/user-1/meal-1.jpg");
  });
});
