const mockGetApp = jest.fn();
const mockGetAuth = jest.fn();
const mockReadPublicEnv = jest.fn();

jest.mock("@react-native-firebase/app", () => ({
  getApp: (...args: unknown[]) => mockGetApp(...args),
}));

jest.mock("@react-native-firebase/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
}));

jest.mock("@/services/publicEnv", () => ({
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { get } = require("@/services/apiClient");

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

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { get } = require("@/services/apiClient");

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
});
