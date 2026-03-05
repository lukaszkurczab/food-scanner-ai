import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { UserData } from "@/types";
import {
  changeUsernameService,
  changeEmailService,
  createInitialUserProfile,
  deleteAccountService,
  exportUserData,
  fetchUserFromCloud,
  getUserLocal,
  updateUserLanguageInFirestore,
  uploadAndSaveAvatar,
  upsertUserLocal,
} from "@/services/user/profile";

const mockFetchUserProfileRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockMergeUserProfileRemote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUploadUserAvatarRemote = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockClaimUsername = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockEmailCredential = jest.fn<(...args: unknown[]) => unknown>();
const mockReauthenticateWithCredential = jest.fn<
  (...args: unknown[]) => Promise<void>
>();
const mockGetAuth = jest.fn<(...args: unknown[]) => { currentUser: unknown }>();
const mockCurrentUserDelete = jest.fn<() => Promise<void>>();

jest.mock("@/services/user/userProfileRepository", () => ({
  fetchUserProfileRemote: (...args: unknown[]) => mockFetchUserProfileRemote(...args),
  mergeUserProfileRemote: (...args: unknown[]) => mockMergeUserProfileRemote(...args),
  uploadUserAvatarRemote: (...args: unknown[]) => mockUploadUserAvatarRemote(...args),
}));

jest.mock("@/services/usernameService", () => ({
  claimUsername: (...args: unknown[]) => mockClaimUsername(...args),
}));

jest.mock("@/services/apiClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
}));

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(),
}));

jest.mock("@react-native-firebase/auth", () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  EmailAuthProvider: { credential: (...args: unknown[]) => mockEmailCredential(...args) },
  reauthenticateWithCredential: (...args: unknown[]) =>
    mockReauthenticateWithCredential(...args),
  verifyBeforeUpdateEmail: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///docs/",
  createDownloadResumable: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("react-native-zip-archive", () => ({
  zip: jest.fn(),
}));

jest.mock("react-native", () => ({
  Appearance: {
    getColorScheme: () => "dark",
  },
}));

describe("services/user/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-03T12:00:00.000Z"));
    mockMergeUserProfileRemote.mockResolvedValue(undefined);
    mockUploadUserAvatarRemote.mockResolvedValue({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:00:00.000Z",
    });
    mockClaimUsername.mockResolvedValue("neo");
    mockGet.mockResolvedValue({
      profile: { uid: "u1", username: "neo" },
      meals: [{ id: "meal-1" }],
      myMeals: [{ id: "saved-1" }],
      chatMessages: [{ id: "chat-1" }],
    });
    mockPost.mockResolvedValue(undefined);
    mockEmailCredential.mockReturnValue({ providerId: "password" });
    mockReauthenticateWithCredential.mockResolvedValue(undefined);
    mockGetAuth.mockReturnValue({
      currentUser: {
        email: "u1@example.com",
        delete: mockCurrentUserDelete,
      },
    });
    mockCurrentUserDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("parses repository payload for local and cloud fetches", async () => {
    mockFetchUserProfileRemote.mockResolvedValue({
      uid: "u1",
      email: "u1@example.com",
      username: "neo",
      darkTheme: true,
    });

    await expect(getUserLocal("u1")).resolves.toMatchObject({
      uid: "u1",
      email: "u1@example.com",
      username: "neo",
      darkTheme: true,
      language: "en",
      plan: "free",
    });

    await expect(fetchUserFromCloud("u1")).resolves.toMatchObject({
      uid: "u1",
      email: "u1@example.com",
      username: "neo",
    });
    expect(mockFetchUserProfileRemote).toHaveBeenNthCalledWith(1, "u1");
    expect(mockFetchUserProfileRemote).toHaveBeenNthCalledWith(2, "u1");
  });

  it("delegates profile writes to repository helpers", async () => {
    const profile: UserData = {
      uid: "u1",
      email: "u1@example.com",
      username: "neo",
      plan: "free",
      createdAt: 1,
      lastLogin: "2026-03-03T12:00:00.000Z",
      surveyComplited: false,
      syncState: "pending",
      unitsSystem: "metric",
      age: "",
      sex: "female",
      height: "",
      heightInch: "",
      weight: "",
      preferences: [],
      activityLevel: "moderate",
      goal: "maintain",
      chronicDiseases: [],
      chronicDiseasesOther: "",
      allergies: [],
      allergiesOther: "",
      lifestyle: "",
      aiStyle: "none",
      aiFocus: "none",
      aiFocusOther: "",
      aiNote: "",
      calorieTarget: 0,
      lastSyncedAt: "",
      darkTheme: false,
      avatarUrl: "",
      avatarLocalPath: "",
      avatarlastSyncedAt: "",
      language: "en",
    };

    await upsertUserLocal(profile);
    await updateUserLanguageInFirestore("u1", "pl");

    expect(mockMergeUserProfileRemote).toHaveBeenNthCalledWith(1, "u1", profile);
    expect(mockMergeUserProfileRemote).toHaveBeenNthCalledWith(2, "u1", {
      language: "pl",
    });
  });

  it("uploads avatar via repository and persists synced metadata", async () => {
    const result = await uploadAndSaveAvatar({
      userUid: "u1",
      localUri: "file:///avatar.jpg",
    });

    expect(mockUploadUserAvatarRemote).toHaveBeenCalledWith(
      "u1",
      "file:///avatar.jpg",
    );
    expect(result).toEqual({
      avatarUrl: "https://cdn/avatar.jpg",
      avatarLocalPath: "file:///avatar.jpg",
      avatarlastSyncedAt: "2026-03-03T12:00:00.000Z",
    });
  });

  it("fetches export payload from backend", async () => {
    await expect(exportUserData("u1")).resolves.toEqual({
      profile: { uid: "u1", username: "neo" },
      meals: [{ id: "meal-1" }],
      myMeals: [{ id: "saved-1" }],
      chatMessages: [{ id: "chat-1" }],
    });

    expect(mockGet).toHaveBeenCalledWith("/users/me/export");
  });

  it("reauthenticates and delegates username claim to backend service", async () => {
    await changeUsernameService({
      uid: "u1",
      newUsername: "Morpheus",
      password: "Strong1!",
    });

    expect(mockEmailCredential).toHaveBeenCalledWith(
      "u1@example.com",
      "Strong1!",
    );
    expect(mockReauthenticateWithCredential).toHaveBeenCalledWith(
      expect.objectContaining({ email: "u1@example.com" }),
      { providerId: "password" },
    );
    expect(mockClaimUsername).toHaveBeenCalledWith("Morpheus", "u1");
  });

  it("persists emailPending through backend after verify-before-update flow", async () => {
    await changeEmailService({
      uid: "u1",
      newEmail: "new@example.com",
      password: "Strong1!",
    });

    expect(mockEmailCredential).toHaveBeenCalledWith(
      "u1@example.com",
      "Strong1!",
    );
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith(
      "/users/me/email-pending",
      { email: "new@example.com" },
    );
  });

  it("reauthenticates, calls backend cascade, and deletes auth user", async () => {
    await deleteAccountService({
      uid: "u1",
      password: "Strong1!",
    });

    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith("/users/me/delete");
    expect(mockCurrentUserDelete).toHaveBeenCalledWith();
  });

  it("creates initial user profile using provided supported language", async () => {
    await createInitialUserProfile(
      { uid: "u1", email: "u1@example.com" } as never,
      "neo",
      "pl-PL",
    );

    expect(mockMergeUserProfileRemote).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        uid: "u1",
        email: "u1@example.com",
        username: "neo",
        plan: "free",
        darkTheme: true,
        language: "pl",
        syncState: "pending",
      }),
    );
  });

  it("falls back to en when initial language is missing or unsupported", async () => {
    await createInitialUserProfile(
      { uid: "u1", email: "u1@example.com" } as never,
      "neo",
      "de-DE",
    );

    expect(mockMergeUserProfileRemote).toHaveBeenLastCalledWith(
      "u1",
      expect.objectContaining({
        language: "en",
      }),
    );

    await createInitialUserProfile(
      { uid: "u1", email: "u1@example.com" } as never,
      "neo",
    );
    expect(mockMergeUserProfileRemote).toHaveBeenLastCalledWith(
      "u1",
      expect.objectContaining({
        language: "en",
      }),
    );
  });
});
