import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { authLogout, authRegister } from "@/feature/Auth/services/authService";

const mockGetAuth = jest.fn<(...args: unknown[]) => unknown>();
const mockCreateUserWithEmailAndPassword = jest.fn<
  (...args: unknown[]) => Promise<{ user: { uid: string; email: string; delete: () => Promise<void> } }>
>();
const mockClaimUsername = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockCreateInitialUserProfile = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDelete = jest.fn<() => Promise<void>>();
const mockSignOut = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockGetAllKeys = jest.fn<() => Promise<string[]>>();
const mockMultiRemove = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockStopSyncLoop = jest.fn<() => void>();
const mockResetOfflineStorage = jest.fn<() => void>();
const mockCleanupUserOfflineAssets = jest.fn<
  (uid: string | null) => Promise<void>
>();
const mockCancelAllReminderScheduling = jest.fn<
  (uid: string) => Promise<void>
>();

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(),
}));

jest.mock("@react-native-firebase/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getAllKeys: () => mockGetAllKeys(),
    multiRemove: (...args: unknown[]) => mockMultiRemove(...args),
  },
  getAllKeys: () => mockGetAllKeys(),
  multiRemove: (...args: unknown[]) => mockMultiRemove(...args),
}));

jest.mock("@/services/offline/sync.engine", () => ({
  stopSyncLoop: () => mockStopSyncLoop(),
}));

jest.mock("@/services/offline/db", () => ({
  resetOfflineStorage: () => mockResetOfflineStorage(),
}));

jest.mock("@/services/offline/fileCleanup", () => ({
  cleanupUserOfflineAssets: (uid: string | null) =>
    mockCleanupUserOfflineAssets(uid),
}));

jest.mock("@/services/reminders/reminderScheduling", () => ({
  cancelAllReminderScheduling: (uid: string) =>
    mockCancelAllReminderScheduling(uid),
}));

jest.mock("@/services/user/usernameService", () => ({
  claimUsername: (...args: unknown[]) => mockClaimUsername(...args),
}));

jest.mock("@/services/user/userService", () => ({
  createInitialUserProfile: (...args: unknown[]) =>
    mockCreateInitialUserProfile(...args),
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
    mockGetAllKeys.mockResolvedValue([]);
    mockMultiRemove.mockResolvedValue(undefined);
    mockStopSyncLoop.mockReset();
    mockResetOfflineStorage.mockReset();
    mockCleanupUserOfflineAssets.mockReset();
    mockCleanupUserOfflineAssets.mockResolvedValue(undefined);
    mockCancelAllReminderScheduling.mockReset();
    mockCancelAllReminderScheduling.mockResolvedValue(undefined);
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
    mockI18n.resolvedLanguage = "pl";
    const user = await authRegister("user@example.com", "Strong1!", "Neo");

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    expect(mockClaimUsername).toHaveBeenCalledWith("Neo", "user-1");
    expect(mockCreateInitialUserProfile).toHaveBeenCalledWith(user, "Neo", "pl");
    expect(user.uid).toBe("user-1");
  });

  it("normalizes region language and falls back to en for unsupported values", async () => {
    mockI18n.resolvedLanguage = "pl-PL";
    await authRegister("user@example.com", "Strong1!", "Neo");
    expect(mockCreateInitialUserProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ uid: "user-1" }),
      "Neo",
      "pl",
    );

    mockI18n.resolvedLanguage = "";
    mockI18n.language = "de-DE";
    await authRegister("user@example.com", "Strong1!", "Neo");
    expect(mockCreateInitialUserProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({ uid: "user-1" }),
      "Neo",
      "en",
    );
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

  it("cleans local offline state and scoped storage on logout", async () => {
    mockGetAllKeys.mockResolvedValue([
      "user:profile:user-1",
      "sync:last_pull_ts:user-1",
      "notif:sys:ids:user-1:stats",
      "theme:mode",
    ]);

    await authLogout();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockStopSyncLoop).toHaveBeenCalled();
    expect(mockCancelAllReminderScheduling).toHaveBeenCalledWith("user-1");
    expect(mockResetOfflineStorage).toHaveBeenCalled();
    expect(mockCleanupUserOfflineAssets).toHaveBeenCalledWith("user-1");
    expect(mockMultiRemove).toHaveBeenCalledWith([
      "user:profile:user-1",
      "sync:last_pull_ts:user-1",
      "notif:sys:ids:user-1:stats",
      "premium_status:anon",
    ]);
  });
});
