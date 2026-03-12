import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useUserProfileState } from "@/feature/UserProfile/hooks/useUserProfileState";

const mockSetMode = jest.fn<(...args: unknown[]) => void>();
const mockUpdateUser = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteUser = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockExportUserData = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockRetryProfileSync = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockRefreshUser = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockEnsurePremiumBadges = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSubscribeStreak = jest.fn<(...args: unknown[]) => () => void>();
const mockUseAuthContext = jest.fn(() => ({ uid: "u1" }));
const mockUseNetInfo = jest.fn(() => ({ isConnected: true }));

let mockUserData: Record<string, unknown> | null = {
  uid: "u1",
  username: "neo",
  email: "u1@example.com",
  avatarUrl: "",
  avatarLocalPath: "",
  darkTheme: false,
  language: "en",
};
let mockLoadingUser = false;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/theme/useTheme", () => ({
  useTheme: () => ({
    mode: "light",
    setMode: (...args: unknown[]) => mockSetMode(...args),
  }),
}));

jest.mock("@/context/UserContext", () => ({
  useUserContext: () => ({
    userData: mockUserData,
    loadingUser: mockLoadingUser,
    refreshUser: (...args: unknown[]) => mockRefreshUser(...args),
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    exportUserData: (...args: unknown[]) => mockExportUserData(...args),
    syncState: "synced",
    retryingProfileSync: false,
    retryProfileSync: (...args: unknown[]) => mockRetryProfileSync(...args),
  }),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => ({ isPremium: false }),
}));

jest.mock("@/hooks/useBadges", () => ({
  useBadges: () => ({
    badges: [],
    ensurePremiumBadges: (...args: unknown[]) => mockEnsurePremiumBadges(...args),
  }),
}));

jest.mock("@/feature/Auth/services/authService", () => ({
  authLogout: jest.fn(async () => undefined),
}));

jest.mock("@/services/gamification/streakService", () => ({
  subscribeStreak: (...args: unknown[]) => mockSubscribeStreak(...args),
}));

describe("feature/UserProfile/useUserProfileState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ uid: "u1" });
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUserData = {
      uid: "u1",
      username: "neo",
      email: "u1@example.com",
      avatarUrl: "",
      avatarLocalPath: "",
      darkTheme: false,
      language: "en",
    };
    mockLoadingUser = false;
    mockUpdateUser.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
    mockExportUserData.mockResolvedValue("file:///tmp/export.pdf");
    mockRetryProfileSync.mockResolvedValue(undefined);
    mockRefreshUser.mockResolvedValue(undefined);
    mockEnsurePremiumBadges.mockResolvedValue(undefined);
    mockSubscribeStreak.mockImplementation((_uid, cb) => {
      (cb as (state: { current: number }) => void)({ current: 2 });
      return () => undefined;
    });
  });

  it("toggles theme locally without backend profile update", async () => {
    const navigation = { reset: jest.fn() } as never;
    const { result } = renderHook(() => useUserProfileState({ navigation }));
    await waitFor(() => {
      expect(mockSubscribeStreak).toHaveBeenCalledWith("u1", expect.any(Function));
    });

    act(() => {
      result.current.handleThemeToggle(true);
    });

    expect(mockSetMode).toHaveBeenCalledWith("dark");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("does not redirect to login when uid exists but profile is temporarily missing", async () => {
    mockUserData = null;
    const navigation = { reset: jest.fn() };
    renderHook(() => useUserProfileState({ navigation: navigation as never }));

    await waitFor(() => {
      expect(navigation.reset).not.toHaveBeenCalled();
    });
  });

  it("redirects to login when auth uid is missing", async () => {
    mockUseAuthContext.mockReturnValue({ uid: "" });
    mockUserData = null;
    const navigation = { reset: jest.fn() };
    renderHook(() => useUserProfileState({ navigation: navigation as never }));

    await waitFor(() => {
      expect(navigation.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: "Login" }],
      });
    });
  });

  it("exposes profile reload action", async () => {
    const navigation = { reset: jest.fn() };
    const { result } = renderHook(() =>
      useUserProfileState({ navigation: navigation as never }),
    );

    await act(async () => {
      await result.current.handleRetryProfileLoad();
    });

    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  });
});
