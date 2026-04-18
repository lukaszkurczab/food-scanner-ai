import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { getMealImage, pickMealPhotoUri } from "@/utils/mealImage";
import * as FileSystem from "expo-file-system/legacy";
import { ensureLocalMealPhoto } from "@/services/meals/mealService.images";

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock("@/services/meals/mealService.images", () => ({
  ensureLocalMealPhoto: jest.fn(),
}));

const getInfoAsyncMock = FileSystem.getInfoAsync as jest.MockedFunction<
  typeof FileSystem.getInfoAsync
>;
const ensureLocalMealPhotoMock = ensureLocalMealPhoto as jest.MockedFunction<
  typeof ensureLocalMealPhoto
>;

const createMeal = (overrides: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-10T08:00:00.000Z",
  type: "breakfast",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-03-10T08:00:00.000Z",
  updatedAt: "2026-03-10T08:00:00.000Z",
  syncState: "synced",
  source: "manual",
  ...overrides,
});

describe("getMealImage", () => {
  beforeEach(() => {
    getInfoAsyncMock.mockReset();
    ensureLocalMealPhotoMock.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns first existing local URI candidate", async () => {
    getInfoAsyncMock
      .mockResolvedValueOnce({ exists: false } as never)
      .mockResolvedValueOnce({ exists: true } as never);

    const meal = createMeal({
      localPhotoUrl: "file://local-a.jpg",
      photoLocalPath: "content://local-b.jpg",
      photoUrl: "https://remote.example.com/image.jpg",
    });

    await expect(getMealImage(meal)).resolves.toBe("content://local-b.jpg");
    expect(ensureLocalMealPhotoMock).not.toHaveBeenCalled();
  });

  it("continues after FileSystem error and can still find next local URI", async () => {
    getInfoAsyncMock
      .mockRejectedValueOnce(new Error("fs-failure"))
      .mockResolvedValueOnce({ exists: true } as never);

    const meal = createMeal({
      localPhotoUrl: "file://broken.jpg",
      photoLocalPath: "file://fallback.jpg",
    });

    await expect(getMealImage(meal)).resolves.toBe("file://fallback.jpg");
  });

  it("uses ensured local image when no candidate exists on disk", async () => {
    getInfoAsyncMock.mockResolvedValue({ exists: false } as never);
    ensureLocalMealPhotoMock.mockResolvedValue("file://ensured.jpg");

    const meal = createMeal({
      cloudId: "cloud-1",
      imageId: "image-1",
      photoUrl: "https://remote.example.com/fallback.jpg",
    });

    await expect(getMealImage(meal)).resolves.toBe("file://ensured.jpg");
    expect(ensureLocalMealPhotoMock).toHaveBeenCalledWith({
      uid: "user-1",
      cloudId: "cloud-1",
      imageId: "image-1",
      photoUrl: "https://remote.example.com/fallback.jpg",
    });
  });

  it("falls back to remote photo URL or null when nothing local is available", async () => {
    getInfoAsyncMock.mockResolvedValue({ exists: false } as never);
    ensureLocalMealPhotoMock.mockResolvedValue(null);

    const withRemote = createMeal({
      photoUrl: "https://remote.example.com/photo.jpg",
      cloudId: undefined,
      imageId: undefined,
    });
    const withoutRemote = createMeal({
      photoUrl: null,
      cloudId: undefined,
      imageId: undefined,
    });

    await expect(getMealImage(withRemote)).resolves.toBe(
      "https://remote.example.com/photo.jpg",
    );
    await expect(getMealImage(withoutRemote)).resolves.toBeNull();

    expect(ensureLocalMealPhotoMock).toHaveBeenNthCalledWith(1, {
      uid: "user-1",
      cloudId: null,
      imageId: null,
      photoUrl: "https://remote.example.com/photo.jpg",
    });
    expect(ensureLocalMealPhotoMock).toHaveBeenNthCalledWith(2, {
      uid: "user-1",
      cloudId: null,
      imageId: null,
      photoUrl: null,
    });
  });
});

describe("pickMealPhotoUri", () => {
  it("prefers a local URI even when localPhotoUrl points to a stale remote image", () => {
    const meal = createMeal({
      localPhotoUrl: "https://remote.example.com/old.jpg",
      photoLocalPath: null,
      photoUrl: "file:///fresh-photo.jpg",
    });

    expect(pickMealPhotoUri(meal)).toBe("file:///fresh-photo.jpg");
  });

  it("falls back to available remote URI when no local URI exists", () => {
    const meal = createMeal({
      localPhotoUrl: "https://remote.example.com/old.jpg",
      photoLocalPath: null,
      photoUrl: "https://remote.example.com/new.jpg",
    });

    expect(pickMealPhotoUri(meal)).toBe("https://remote.example.com/new.jpg");
  });
});
