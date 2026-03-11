import { afterEach } from "@jest/globals";
const mockGetApp = jest.fn();
const mockGetAuth = jest.fn();
const mockReadPublicEnv = jest.fn();

jest.mock("@react-native-firebase/app", () => ({
  getApp: (...args: unknown[]) => mockGetApp(...args),
}));

jest.mock("@react-native-firebase/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
}));

jest.mock("@/services/core/publicEnv", () => ({
  readPublicEnv: (...args: unknown[]) => mockReadPublicEnv(...args),
}));

describe("apiClient", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockGetApp.mockReturnValue({ name: "app" });
    mockReadPublicEnv.mockImplementation((key: string) => {
      if (key === "EXPO_PUBLIC_API_BASE_URL") {
        return "https://api.example.com";
      }

      if (key === "EXPO_PUBLIC_API_VERSION") {
        return "v1";
      }

      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("adds Firebase bearer token when current user exists", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-123");
    mockGetAuth.mockReturnValue({
      currentUser: { getIdToken },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // Use require after resetting modules so API_VERSION is recomputed from mocks.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { get } = require("@/services/core/apiClient");

    await get("/ai/usage");

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/ai/usage",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
  });

  it("omits Authorization header when no current user exists", async () => {
    mockGetAuth.mockReturnValue({
      currentUser: null,
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { get } = require("@/services/core/apiClient");

    await get("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/health",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      }),
    );
  });

  it("keeps multipart uploads authenticated without forcing JSON content type", async () => {
    const getIdToken = jest.fn().mockResolvedValue("token-456");
    mockGetAuth.mockReturnValue({
      currentUser: { getIdToken },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const formData = new FormData();
    formData.append("file", "payload");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { upload } = require("@/services/core/apiClient");

    await upload("/users/me/avatar", formData);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/users/me/avatar",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer token-456",
        }),
        body: formData,
      }),
    );
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
  });

  it("returns api/timeout when request exceeds timeout", async () => {
    jest.useFakeTimers();
    mockGetAuth.mockReturnValue({
      currentUser: null,
    });

    const fetchMock = jest.fn().mockReturnValue(new Promise(() => {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { get } = require("@/services/core/apiClient");

    const pending = get("/health", { timeout: 5 });
    const captured = pending.catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(10);

    await expect(captured).resolves.toMatchObject({
      code: "api/timeout",
      source: "ApiClient",
      retryable: true,
    });
  });
});
