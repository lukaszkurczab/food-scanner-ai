import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { BottomTabBar } from "@/components/BottomTabBar";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockNavigate = jest.fn<(route: string) => void>();
const mockAvatarBadge = jest.fn<(props: unknown) => null>(() => null);
const mockUseAuthContext = jest.fn<() => { uid: string }>(() => ({ uid: "u-1" }));
const mockUseUserContext = jest.fn<
  () => { userData: { avatarLocalPath?: string; avatarUrl?: string } | null }
>(() => ({ userData: { avatarLocalPath: "file:///avatar.jpg" } }));
const mockUsePremiumContext = jest.fn<() => { isPremium: boolean }>(() => ({
  isPremium: false,
}));
const mockUseBadges = jest.fn<
  (uid: string) => { badges: Array<{ type: string; milestone: number; color: string }> }
>(() => ({ badges: [] }));

jest.mock("@/navigation/navigate", () => ({
  navigate: (route: string) => mockNavigate(route),
  navigationRef: {
    getCurrentRoute: () => undefined,
  },
}));

jest.mock("@/components/AvatarBadge", () => ({
  __esModule: true,
  default: (props: unknown) => mockAvatarBadge(props),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/UserContext", () => ({
  useUserContext: () => mockUseUserContext(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@/hooks/useBadges", () => ({
  useBadges: (uid: string) => mockUseBadges(uid),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("BottomTabBar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockAvatarBadge.mockClear();
    mockUseBadges.mockClear();
    mockUsePremiumContext.mockReturnValue({ isPremium: false });
    mockUseBadges.mockReturnValue({
      badges: [
        { type: "streak", milestone: 30, color: "#111111" },
        { type: "streak", milestone: 90, color: "#222222" },
      ],
    });
  });

  it("navigates to target screens from tab presses", () => {
    const { getByTestId } = renderWithTheme(<BottomTabBar />);

    fireEvent.press(getByTestId("tab-home"));
    fireEvent.press(getByTestId("tab-statistics"));
    fireEvent.press(getByTestId("tab-add-meal"));
    fireEvent.press(getByTestId("tab-chat"));
    fireEvent.press(getByTestId("tab-profile"));

    expect(mockNavigate.mock.calls.map((call) => call[0])).toEqual([
      "Home",
      "Statistics",
      "MealAddMethod",
      "Chat",
      "Profile",
    ]);
  });

  it("uses highest streak badge color for profile border when not premium", () => {
    renderWithTheme(<BottomTabBar />);

    const avatarProps = mockAvatarBadge.mock.calls[0][0] as {
      overrideColor?: string;
      uri?: string;
      accessibilityLabel?: string;
    };

    expect(avatarProps.overrideColor).toBe("#222222");
    expect(avatarProps.uri).toBe("file:///avatar.jpg");
    expect(avatarProps.accessibilityLabel).toBe("tabs.profile_accessibility");
  });

  it("uses premium border color when user has premium", () => {
    mockUsePremiumContext.mockReturnValue({ isPremium: true });
    renderWithTheme(<BottomTabBar />);

    const avatarProps = mockAvatarBadge.mock.calls[0][0] as {
      overrideColor?: string;
    };
    expect(avatarProps.overrideColor).toBe("#C9A227");
  });
});
