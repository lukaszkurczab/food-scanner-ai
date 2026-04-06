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

jest.mock("@/services/core/apiClient", () => ({
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

  it("returns null when backend returns no profile", async () => {
    mockGet.mockResolvedValue({ profile: null });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchUserProfileRemote } = require("@/services/user/userProfileRepository");

    await expect(fetchUserProfileRemote("u1")).resolves.toBeNull();
  });

  it("returns cached profile immediately without fetching", async () => {
    mockGet.mockResolvedValue({ profile: { uid: "u1", username: "neo" } });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const repo = require("@/services/user/userProfileRepository");

    // Populate cache via a fetch first
    await repo.fetchUserProfileRemote("u1");
    mockGet.mockClear();

    const received: unknown[] = [];
    repo.subscribeToUserProfile({ uid: "u1", onData: (d: unknown) => received.push(d) });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ uid: "u1", username: "neo" });
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("calls onData(null) when cache holds null for the uid", async () => {
    mockGet.mockResolvedValue({ profile: null });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const repo = require("@/services/user/userProfileRepository");

    // Cache null explicitly
    await repo.fetchUserProfileRemote("u-null");
    mockGet.mockClear();

    const received: unknown[] = [];
    repo.subscribeToUserProfile({ uid: "u-null", onData: (d: unknown) => received.push(d) });

    expect(received).toEqual([null]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("skips cache update in uploadUserAvatarRemote when profile is not cached", async () => {
    mockUpload.mockResolvedValue({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:00:00.000Z",
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uploadUserAvatarRemote } = require("@/services/user/userProfileRepository");

    // uid "u-unknown" has no cache entry — should not throw
    const result = await uploadUserAvatarRemote("u-unknown", "file:///avatar.jpg");

    expect(result).toEqual({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:00:00.000Z",
    });
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

  it("skips backend patch when payload has only local-only/non-editable fields", async () => {
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

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("posts mixed payload without local-only fields", async () => {
    mockPost.mockResolvedValue({ updated: true });
    mockGet.mockResolvedValue({
      profile: { uid: "u1", age: "31" },
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mergeUserProfileRemote } = require("@/services/user/userProfileRepository");

    await mergeUserProfileRemote("u1", {
      language: "pl",
      darkTheme: true,
      age: "31",
    });

    expect(mockPost).toHaveBeenCalledWith("/users/me/profile", {
      age: "31",
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
