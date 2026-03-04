import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  claimUsername,
  isUsernameAvailable,
  normalizeUsername,
} from "@/services/usernameService";

const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/services/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
}));

describe("usernameService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes usernames before sending them to backend", async () => {
    mockGet.mockResolvedValue({ username: "neo", available: true });
    mockPost.mockResolvedValue({ username: "morpheus" });

    await expect(isUsernameAvailable(" Neo ", "user-1")).resolves.toBe(true);
    await expect(claimUsername(" Morpheus ", "user-1")).resolves.toBe("morpheus");

    expect(normalizeUsername(" Neo ")).toBe("neo");
    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/usernames/availability?username=neo",
    );
    expect(mockPost).toHaveBeenCalledWith("/api/v1/users/me/username", {
      username: "morpheus",
    });
  });

  it("maps backend 409 to username/unavailable", async () => {
    mockPost.mockRejectedValue({ status: 409 });

    await expect(claimUsername("neo", "user-1")).rejects.toMatchObject({
      code: "username/unavailable",
      source: "UsernameService",
    });
  });

  it("maps backend 400 to username/invalid", async () => {
    mockPost.mockRejectedValue({ status: 400 });

    await expect(claimUsername("ab", "user-1")).rejects.toMatchObject({
      code: "username/invalid",
      source: "UsernameService",
    });
  });

  it("returns false for empty usernames without backend calls", async () => {
    await expect(isUsernameAvailable("   ")).resolves.toBe(false);

    expect(mockGet).not.toHaveBeenCalled();
  });
});
