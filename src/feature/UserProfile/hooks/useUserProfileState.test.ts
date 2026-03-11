import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useUserProfileState } from "@/feature/UserProfile/hooks/useUserProfileState";

const mockSetMode = jest.fn<(...args: unknown[]) => void>();
const mockUpdateUser = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteUser = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockExportUserData = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockEnsurePremiumBadges = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSubscribeStreak = jest.fn<(...args: unknown[]) => () => void>();

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
    userData: {
      uid: "u1",
      username: "neo",
      email: "u1@example.com",
      avatarUrl: "",
      avatarLocalPath: "",
      darkTheme: false,
      language: "en",
    },
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    exportUserData: (...args: unknown[]) => mockExportUserData(...args),
  }),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => ({ uid: "u1" }),
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
    mockUpdateUser.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
    mockExportUserData.mockResolvedValue("file:///tmp/export.pdf");
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
});
