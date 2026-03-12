import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { detectIngredientsWithVision } from "@/services/ai/visionService";
import { isServiceError } from "@/services/contracts/serviceError";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockUriToBase64 = jest.fn<(uri: string) => Promise<string>>();
const mockConvertToJpegAndResize = jest.fn<
  (
    uri: string,
    width: number,
    height: number,
    options?: Record<string, unknown>,
  ) => Promise<string>
>();
const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
const mockLogError = jest.fn();
const mockUuid = jest.fn<() => string>();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: (...args: []) => mockNetInfoFetch(...args),
  },
}));

jest.mock("@/utils/uriToBase64", () => ({
  uriToBase64: (uri: string) => mockUriToBase64(uri),
}));

jest.mock("@/utils/convertToJpegAndResize", () => ({
  convertToJpegAndResize: (
    uri: string,
    width: number,
    height: number,
    options?: Record<string, unknown>,
  ) => mockConvertToJpegAndResize(uri, width, height, options),
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/services/core/errorLogger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

jest.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

describe("visionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockConvertToJpegAndResize.mockResolvedValue("file:///tmp/resized.jpg");
    mockUriToBase64.mockResolvedValue("base64-image");
    mockUuid.mockImplementation(() => `uuid-${mockUuid.mock.calls.length + 1}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("maps backend photo analyze ingredients directly into app ingredients", async () => {
    mockPost.mockResolvedValueOnce({
      ingredients: [
        {
          name: "Owsianka",
          amount: 250,
          protein: 10,
          fat: 6,
          carbs: 30,
          kcal: 210,
          unit: "ml",
        },
      ],
      userId: "user-1",
      tier: "free",
      balance: 95,
      allocation: 100,
      periodStartAt: "2026-03-03T00:00:00.000Z",
      periodEndAt: "2026-04-03T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
      version: "test",
      persistence: "backend_owned",
    });

    const result = await detectIngredientsWithVision("user-1", "file:///meal.jpg", {
      lang: "EN",
    });

    expect(mockConvertToJpegAndResize).toHaveBeenCalledWith(
      "file:///meal.jpg",
      512,
      512,
      expect.objectContaining({
        userUid: "user-1",
        dir: "tmp",
      }),
    );
    expect(mockUriToBase64).toHaveBeenCalledWith("file:///tmp/resized.jpg");
    expect(mockPost).toHaveBeenCalledWith("/ai/photo/analyze", {
      imageBase64: "base64-image",
      lang: "en",
    });
    expect(result).toMatchObject({
      ingredients: [
        {
          id: expect.any(String),
          name: "Owsianka",
          amount: 250,
          unit: "ml",
          protein: 10,
          fat: 6,
          carbs: 30,
          kcal: 210,
        },
      ],
    });
    expect(result?.credits).toMatchObject({
      balance: 95,
      allocation: 100,
      tier: "free",
    });
  });

  it("returns offline service error when network is unavailable", async () => {
    mockNetInfoFetch.mockResolvedValueOnce({ isConnected: false });

    await expect(
      detectIngredientsWithVision("user-1", "file:///meal.jpg", {
      }),
    ).rejects.toMatchObject({
      code: "offline",
      source: "VisionService",
      retryable: true,
    });

    expect(mockConvertToJpegAndResize).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("wraps backend failures as ai/unavailable and logs them", async () => {
    mockPost.mockRejectedValueOnce(new Error("backend down"));

    try {
      await detectIngredientsWithVision("user-1", "file:///meal.jpg", {
        lang: "pl",
      });
      throw new Error("Expected detectIngredientsWithVision to reject");
    } catch (error) {
      expect(isServiceError(error)).toBe(true);
      expect(error).toMatchObject({
        code: "ai/unavailable",
        source: "VisionService",
        retryable: true,
      });
    }

    expect(mockLogError).toHaveBeenCalledWith(
      "[visionService] backend photo analysis failed",
      { userUid: "user-1", lang: "pl" },
      expect.any(Error),
    );
  });

  it("maps 401 into auth/required service error", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }));

    await expect(
      detectIngredientsWithVision("user-1", "file:///meal.jpg", {
        lang: "pl",
      }),
    ).rejects.toMatchObject({
      code: "auth/required",
      source: "VisionService",
      retryable: false,
    });
  });

  it("passes 402 through for credits refresh flow", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("payment required"), { status: 402 }));

    await expect(
      detectIngredientsWithVision("user-1", "file:///meal.jpg", {
        lang: "pl",
      }),
    ).rejects.toMatchObject({
      status: 402,
    });
  });
});
