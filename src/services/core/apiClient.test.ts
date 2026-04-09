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

    await get("/ai/credits");

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/ai/credits",
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

  it("retries multipart uploads for transient server failures", async () => {
    jest.useFakeTimers();
    const getIdToken = jest.fn().mockResolvedValue("token-456");
    mockGetAuth.mockReturnValue({
      currentUser: { getIdToken },
    });

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ detail: "Database error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ ok: true }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const formData = new FormData();
    formData.append("file", "payload");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { upload } = require("@/services/core/apiClient");

    const pending = upload("/users/me/meals/photo", formData);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    // Advance through all retry attempts:
    // attempt 0: 5ms timeout → sleep(1000ms) → attempt 1: 5ms timeout → sleep(2000ms) → attempt 2: 5ms timeout → throws
    await jest.advanceTimersByTimeAsync(3100);

    await expect(captured).resolves.toMatchObject({
      code: "api/timeout",
      source: "ApiClient",
      retryable: true,
    });
  });
});
