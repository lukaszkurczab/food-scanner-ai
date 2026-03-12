import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import ManageSubscriptionScreen from "@/feature/Subscription/screens/ManageSubscriptionScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type PaywallModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
  onRestore: () => void;
  busy: boolean;
  priceText?: string | null;
};

const mockUsePremiumContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUseAiCreditsContext = jest.fn();
const mockUseManageSubscriptionState = jest.fn();
const mockUseNetInfo = jest.fn<() => { isConnected: boolean | null }>();

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => mockUseAiCreditsContext(),
}));

jest.mock("@/feature/Subscription/hooks/useManageSubscriptionState", () => ({
  useManageSubscriptionState: (params: unknown) =>
    mockUseManageSubscriptionState(params),
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? `profile:${key}`,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) =>
      createElement(View, null, children),
    BackTitleHeader: ({
      title,
    }: {
      title: string;
    }) => createElement(Text, null, `header:${title}`),
    FullScreenLoader: () => createElement(Text, null, "full-screen-loader"),
    PrimaryButton: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    }) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

jest.mock("@/feature/Subscription/components/PaywallModal", () => ({
  PaywallModal: ({
    visible,
    onClose,
    onSubscribe,
    onRestore,
    priceText,
  }: PaywallModalProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return visible
      ? createElement(
          View,
          null,
          createElement(Text, null, `paywall:${priceText ?? ""}`),
          createElement(
            Pressable,
            { onPress: onSubscribe },
            createElement(Text, null, "subscribe-paywall"),
          ),
          createElement(
            Pressable,
            { onPress: onRestore },
            createElement(Text, null, "restore-paywall"),
          ),
          createElement(
            Pressable,
            { onPress: onClose },
            createElement(Text, null, "close-paywall"),
          ),
        )
      : null;
  },
}));

jest.mock("@/components/AiCreditsSummaryCard", () => ({
  AiCreditsSummaryCard: ({
    balance,
    allocation,
  }: {
    balance: number | null;
    allocation: number | null;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `credits:${balance ?? "-"}:${allocation ?? "-"}`);
  },
}));

describe("ManageSubscriptionScreen", () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseAiCreditsContext.mockReturnValue({
      credits: {
        balance: 76,
        allocation: 800,
        tier: "premium",
        periodEndAt: "2026-05-14T10:00:00.000Z",
      },
      loading: false,
    });
    mockUsePremiumContext.mockReturnValue({
      isPremium: false,
      subscription: { state: "inactive" },
      setDevPremium: jest.fn(),
      refreshPremium: jest.fn(),
    });
  });

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it("shows the loader while subscription data is missing", () => {
    mockUsePremiumContext.mockReturnValue({
      isPremium: false,
      subscription: null,
      setDevPremium: jest.fn(),
      refreshPremium: jest.fn(),
    });
    mockUseManageSubscriptionState.mockReturnValue({
      expanded: null,
      busy: false,
      paywallVisible: false,
      termsUrl: null,
      privacyUrl: null,
      priceText: null,
      showRenew: false,
      showStart: false,
      showManageInStore: false,
      headerStatus: "",
      isPremiumComputed: false,
      toggleExpanded: jest.fn(),
      tryOpenManage: jest.fn(),
      tryRestore: jest.fn(),
      trySubscribe: jest.fn(),
      tryOpenRefundPolicy: jest.fn(),
      openPaywall: jest.fn(),
      closePaywall: jest.fn(),
      toggleDevPremium: jest.fn(),
      openTerms: jest.fn(),
      openPrivacy: jest.fn(),
    });

    const { getByText } = renderWithTheme(
      <ManageSubscriptionScreen navigation={{ setOptions: jest.fn() } as never} />,
    );

    expect(getByText("full-screen-loader")).toBeTruthy();
  });

  it("shows offline fallback when subscription data is missing and device is offline", () => {
    const refreshPremium = jest.fn(async () => false);
    const navigation = {
      navigate: jest.fn<(screen: string) => void>(),
      setOptions: jest.fn(),
    };
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    mockUsePremiumContext.mockReturnValue({
      isPremium: false,
      subscription: null,
      setDevPremium: jest.fn(),
      refreshPremium,
    });
    mockUseManageSubscriptionState.mockReturnValue({
      expanded: null,
      busy: false,
      paywallVisible: false,
      termsUrl: null,
      privacyUrl: null,
      priceText: null,
      showRenew: false,
      showStart: false,
      showManageInStore: false,
      headerStatus: "",
      isPremiumComputed: false,
      toggleExpanded: jest.fn(),
      tryOpenManage: jest.fn(),
      tryRestore: jest.fn(),
      trySubscribe: jest.fn(),
      tryOpenRefundPolicy: jest.fn(),
      openPaywall: jest.fn(),
      closePaywall: jest.fn(),
      toggleDevPremium: jest.fn(),
      openTerms: jest.fn(),
      openPrivacy: jest.fn(),
    });

    const { getByText } = renderWithTheme(
      <ManageSubscriptionScreen navigation={navigation as never} />,
    );

    expect(getByText("Subscription details unavailable")).toBeTruthy();
    expect(
      getByText(
        "You're offline and subscription details are not available locally yet.",
      ),
    ).toBeTruthy();

    fireEvent.press(getByText("profile:common:retry"));
    fireEvent.press(getByText("Back"));

    expect(refreshPremium).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith("Profile");
  });

  it("renders subscription actions, legal links and paywall controls", () => {
    const navigation = { canGoBack: jest.fn(() => true), goBack: jest.fn() };
    const toggleExpanded = jest.fn();
    const tryOpenManage = jest.fn();
    const tryRestore = jest.fn();
    const trySubscribe = jest.fn();
    const tryOpenRefundPolicy = jest.fn();
    const openPaywall = jest.fn();
    const closePaywall = jest.fn();
    const toggleDevPremium = jest.fn();
    const openTerms = jest.fn();
    const openPrivacy = jest.fn();

    mockUseManageSubscriptionState.mockReturnValue({
      expanded: "aiCredits800",
      busy: false,
      paywallVisible: true,
      termsUrl: "https://example.com/terms",
      privacyUrl: "https://example.com/privacy",
      priceText: "$9.99",
      showRenew: false,
      showStart: true,
      showManageInStore: true,
      headerStatus: "Inactive",
      isPremiumComputed: false,
      toggleExpanded,
      tryOpenManage,
      tryRestore,
      trySubscribe,
      tryOpenRefundPolicy,
      openPaywall,
      closePaywall,
      toggleDevPremium,
      openTerms,
      openPrivacy,
    });

    const { getByText } = renderWithTheme(
      <ManageSubscriptionScreen navigation={navigation as never} />,
    );

    fireEvent.press(getByText("profile:manageSubscription.benefit_aiCredits800"));
    fireEvent.press(getByText("Restore Purchases"));
    fireEvent.press(getByText("profile:manageSubscription.refundPolicy"));
    fireEvent.press(getByText("Terms of Service"));
    fireEvent.press(getByText("Privacy Policy"));
    fireEvent.press(getByText("Manage subscription in store"));
    fireEvent.press(getByText("profile:manageSubscription.startSubscription"));
    fireEvent.press(getByText("subscribe-paywall"));
    fireEvent.press(getByText("restore-paywall"));
    fireEvent.press(getByText("close-paywall"));
    fireEvent.press(getByText("DEV: Enable Premium"));

    expect(getByText("header:profile:manageSubscription.title")).toBeTruthy();
    expect(getByText("Inactive")).toBeTruthy();
    expect(getByText("credits:76:800")).toBeTruthy();
    expect(getByText("profile:manageSubscription.benefitDesc_aiCredits800")).toBeTruthy();
    expect(getByText("paywall:$9.99")).toBeTruthy();
    expect(toggleExpanded).toHaveBeenCalledWith("aiCredits800");
    expect(tryRestore).toHaveBeenCalledTimes(2);
    expect(tryOpenRefundPolicy).toHaveBeenCalledTimes(1);
    expect(openTerms).toHaveBeenCalledTimes(1);
    expect(openPrivacy).toHaveBeenCalledTimes(1);
    expect(tryOpenManage).toHaveBeenCalledTimes(1);
    expect(openPaywall).toHaveBeenCalledTimes(1);
    expect(trySubscribe).toHaveBeenCalledTimes(1);
    expect(closePaywall).toHaveBeenCalledTimes(1);
    expect(toggleDevPremium).toHaveBeenCalledTimes(1);
  });
});
