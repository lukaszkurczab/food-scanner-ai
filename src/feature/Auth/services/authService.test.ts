import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { authRegister } from "@/feature/Auth/services/authService";

const mockGetAuth = jest.fn<(...args: unknown[]) => unknown>();
const mockCreateUserWithEmailAndPassword = jest.fn<
  (...args: unknown[]) => Promise<{ user: { uid: string; email: string; delete: () => Promise<void> } }>
>();
const mockClaimUsername = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockCreateInitialUserProfile = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDelete = jest.fn<() => Promise<void>>();

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(),
}));

jest.mock("@react-native-firebase/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  signOut: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
}));

jest.mock("@/services/usernameService", () => ({
  claimUsername: (...args: unknown[]) => mockClaimUsername(...args),
}));

jest.mock("@/services/userService", () => ({
  createInitialUserProfile: (...args: unknown[]) =>
    mockCreateInitialUserProfile(...args),
}));

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuth.mockReturnValue({ app: "auth" });
    mockDelete.mockResolvedValue(undefined);
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "user-1",
        email: "user@example.com",
        delete: mockDelete,
      },
    });
    mockClaimUsername.mockResolvedValue("neo");
    mockCreateInitialUserProfile.mockResolvedValue(undefined);
  });

  it("claims backend username before creating initial profile", async () => {
    const user = await authRegister("user@example.com", "Strong1!", "Neo");

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    expect(mockClaimUsername).toHaveBeenCalledWith("Neo", "user-1");
    expect(mockCreateInitialUserProfile).toHaveBeenCalledWith(user, "Neo");
    expect(user.uid).toBe("user-1");
  });

  it("rolls back auth user when backend username claim fails", async () => {
    mockClaimUsername.mockRejectedValue({ code: "username/unavailable" });

    await expect(
      authRegister("user@example.com", "Strong1!", "Neo"),
    ).rejects.toMatchObject({
      code: "username/unavailable",
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockCreateInitialUserProfile).not.toHaveBeenCalled();
  });
});
