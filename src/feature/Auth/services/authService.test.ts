import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  authLogin,
  authLogout,
  authRegister,
  authSendPasswordReset,
} from "@/feature/Auth/services/authService";

const mockGetAuth = jest.fn<(...args: unknown[]) => unknown>();
const mockCreateUserWithEmailAndPassword = jest.fn<
  (...args: unknown[]) => Promise<{ user: { uid: string; email: string; delete: () => Promise<void> } }>
>();
const mockInitializeUserOnboardingProfile = jest.fn<
  (...args: unknown[]) => Promise<void>
>();
const mockDelete = jest.fn<() => Promise<void>>();
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSignInWithEmailAndPassword = jest.fn<
  (...args: unknown[]) => Promise<{ user: { uid: string } }>
>();
const mockSendPasswordResetEmail = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockResetUserRuntime = jest.fn<
  (...args: unknown[]) => Promise<void>
>();

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(),
}));

jest.mock("@react-native-firebase/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
}));

jest.mock("@/services/session/resetUserRuntime", () => ({
  resetUserRuntime: (...args: unknown[]) => mockResetUserRuntime(...args),
}));

jest.mock("@/services/user/userService", () => ({
  initializeUserOnboardingProfile: (...args: unknown[]) =>
    mockInitializeUserOnboardingProfile(...args),
}));

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: { resolvedLanguage: "en", language: "en" },
}));

const mockI18n = (
  jest.requireMock("@/i18n") as {
    default: { resolvedLanguage?: string; language?: string };
  }
).default;

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.resolvedLanguage = "en";
    mockI18n.language = "en";
    mockGetAuth.mockReturnValue({ app: "auth", currentUser: { uid: "user-1" } });
    mockDelete.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: "user-1" },
    });
    mockSendPasswordResetEmail.mockResolvedValue(undefined);
    mockResetUserRuntime.mockResolvedValue(undefined);
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "user-1",
        email: "user@example.com",
        delete: mockDelete,
      },
    });
    mockInitializeUserOnboardingProfile.mockResolvedValue(undefined);
  });

  it("runs backend-owned onboarding profile initialization after auth user creation", async () => {
    mockI18n.resolvedLanguage = "pl";
    const user = await authRegister("user@example.com", "Strong1!", "Neo");

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    expect(mockInitializeUserOnboardingProfile).toHaveBeenCalledWith(
      "neo",
      "pl",
    );
    expect(user.uid).toBe("user-1");
  });

  it("normalizes auth input emails and username before calling providers", async () => {
    await authLogin("  USER@Example.COM ", "Strong1!");
    await authSendPasswordReset("  USER@Example.COM ");
    await authRegister("  USER@Example.COM ", "Strong1!", "  Neo  ");

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
      "Strong1!",
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
    );
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
      "Strong1!",
    );
    expect(mockInitializeUserOnboardingProfile).toHaveBeenCalledWith(
      "neo",
      "en",
    );
  });

  it("normalizes region language and falls back to en for unsupported values", async () => {
    mockI18n.resolvedLanguage = "pl-PL";
    await authRegister("user@example.com", "Strong1!", "Neo");
    expect(mockInitializeUserOnboardingProfile).toHaveBeenLastCalledWith(
      "neo",
      "pl",
    );

    mockI18n.resolvedLanguage = "";
    mockI18n.language = "de-DE";
    await authRegister("user@example.com", "Strong1!", "Neo");
    expect(mockInitializeUserOnboardingProfile).toHaveBeenLastCalledWith(
      "neo",
      "en",
    );
  });

  it("rolls back auth user when backend onboarding fails", async () => {
    mockInitializeUserOnboardingProfile.mockRejectedValue({
      code: "username/unavailable",
    });

    await expect(
      authRegister("user@example.com", "Strong1!", "Neo"),
    ).rejects.toMatchObject({
      code: "username/unavailable",
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(mockInitializeUserOnboardingProfile).toHaveBeenCalled();
  });

  it("resets user runtime on logout", async () => {
    await authLogout();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockResetUserRuntime).toHaveBeenCalledWith("user-1", {
      reason: "logout",
    });
  });

  it("still resets runtime when signOut fails and rethrows signOut error", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("signout-failed"));

    await expect(authLogout()).rejects.toThrow("signout-failed");

    expect(mockResetUserRuntime).toHaveBeenCalledWith("user-1", {
      reason: "logout",
    });
  });
});
