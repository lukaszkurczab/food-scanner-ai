import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpload = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/services/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
  upload: (...args: unknown[]) => mockUpload(...args),
}));

describe("services/user/userProfileRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches current user profile from backend-owned endpoint", async () => {
    mockGet.mockResolvedValue({
      profile: { uid: "u1", username: "neo", language: "pl" },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchUserProfileRemote } = require("@/services/user/userProfileRepository");

    await expect(fetchUserProfileRemote("u1")).resolves.toEqual({
      uid: "u1",
      username: "neo",
      language: "pl",
    });
    expect(mockGet).toHaveBeenCalledWith("/users/me/profile");
  });

  it("posts only editable profile fields to backend-owned endpoint", async () => {
    mockPost.mockResolvedValue({ updated: true });
    mockGet.mockResolvedValue({
      profile: { uid: "u1", language: "pl", darkTheme: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mergeUserProfileRemote } = require("@/services/user/userProfileRepository");

    await mergeUserProfileRemote("u1", {
      username: "neo",
      language: "pl",
      darkTheme: true,
      avatarLocalPath: "file:///avatar.jpg",
    });

    expect(mockPost).toHaveBeenCalledWith("/users/me/profile", {
      language: "pl",
      darkTheme: true,
    });
  });

  it("uploads avatar through backend-owned endpoint", async () => {
    mockUpload.mockResolvedValue({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:00:00.000Z",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uploadUserAvatarRemote } = require("@/services/user/userProfileRepository");

    await expect(
      uploadUserAvatarRemote("u1", "file:///avatar.jpg"),
    ).resolves.toEqual({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:00:00.000Z",
    });
    expect(mockUpload).toHaveBeenCalledWith("/users/me/avatar", expect.any(FormData));
  });
});
