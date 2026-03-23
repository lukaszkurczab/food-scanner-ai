import { Alert, Linking } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { PaywallCard } from "@/feature/AI/components/PaywallCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type OfferingsPayload = {
  current?: {
    availablePackages: Array<{
      identifier?: string;
      packageType?: string;
      product?: { priceString?: string };
    }>;
  } | null;
};

type RestoreResult = {
  status: "success" | "error" | "cancelled";
  errorCode?: string;
};

const mockGetOfferings = jest.fn<() => Promise<OfferingsPayload>>();
const mockRestorePurchases =
  jest.fn<(uid?: string | null) => Promise<RestoreResult>>();
const mockResolvePurchaseErrorMessage = jest.fn(
  (_t: unknown, code: string | undefined, fallback: string) =>
    `resolved:${code ?? "none"}:${fallback}`,
);
const mockRefreshPremium = jest.fn<() => Promise<boolean>>();
const mockUseAuthContext = jest.fn();
const mockUsePremiumContext = jest.fn();
const mockGetTermsUrl = jest.fn<() => string>();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    getOfferings: () => mockGetOfferings(),
  },
}));

jest.mock("expo-device", () => ({
  isDevice: true,
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

jest.mock("@/services/billing/purchase", () => ({
  restorePurchases: (uid?: string | null) => mockRestorePurchases(uid),
}));

jest.mock("@/services/billing/purchaseErrorMessage", () => ({
  resolvePurchaseErrorMessage: (
    t: unknown,
    code: string | undefined,
    fallback: string,
  ) => mockResolvePurchaseErrorMessage(t, code, fallback),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@/utils/legalUrls", () => ({
  getTermsUrl: () => mockGetTermsUrl(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? `translated:${key}`,
  }),
}));

describe("PaywallCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (Device as { isDevice: boolean }).isDevice = true;

    (
      Constants as unknown as {
        expoConfig: { extra: Record<string, unknown> };
      }
    ).expoConfig.extra = {};

    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUsePremiumContext.mockReturnValue({
      refreshPremium: mockRefreshPremium,
    });

    mockGetOfferings.mockImplementation(() => new Promise(() => undefined));
    mockRestorePurchases.mockResolvedValue({ status: "success" });
    mockRefreshPremium.mockResolvedValue(true);

    mockGetTermsUrl.mockReturnValue(
      "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
    );
  });

  it("renders price line from offerings and handles upgrade", async () => {
    mockGetOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            identifier: "$rc_monthly",
            packageType: "MONTHLY",
            product: { priceString: "$4.99" },
          },
        ],
      },
    });

    const onUpgrade = jest.fn();

    const { getByText } = renderWithTheme(
      <PaywallCard
        balance={2}
        allocation={5}
        renewalAt="2026-04-23T00:00:00.000Z"
        onUpgrade={onUpgrade}
      />,
    );

    await waitFor(() => {
      expect(getByText("$4.99 per month")).toBeTruthy();
    });

    fireEvent.press(getByText("translated:limit.button"));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("shows sign-in alert when restoring without authenticated user", async () => {
    mockUseAuthContext.mockReturnValue({ uid: null });

    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);

    const { getByText } = renderWithTheme(
      <PaywallCard balance={2} allocation={5} renewalAt={null} />,
    );

    fireEvent.press(getByText("Restore Purchases"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Manage subscription",
        "Please sign in to restore purchases.",
      );
    });

    expect(mockRestorePurchases).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("restores purchases and refreshes premium state", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);

    const { getByText } = renderWithTheme(
      <PaywallCard balance={2} allocation={5} renewalAt={null} />,
    );

    fireEvent.press(getByText("Restore Purchases"));

    await waitFor(() => {
      expect(mockRestorePurchases).toHaveBeenCalledWith("user-1");
      expect(mockRefreshPremium).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        "Manage subscription",
        "Purchases restored.",
      );
    });

    alertSpy.mockRestore();
  });

  it("resolves and shows restore error message", async () => {
    mockRestorePurchases.mockResolvedValue({
      status: "error",
      errorCode: "network",
    });

    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);

    const { getByText } = renderWithTheme(
      <PaywallCard balance={2} allocation={5} renewalAt={null} />,
    );

    fireEvent.press(getByText("Restore Purchases"));

    await waitFor(() => {
      expect(mockResolvePurchaseErrorMessage).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Manage subscription",
        expect.stringContaining("resolved:network"),
      );
    });

    alertSpy.mockRestore();
  });

  it("opens terms and privacy links when configured", () => {
    mockGetTermsUrl.mockReturnValue("https://example.com/terms");

    (
      Constants as unknown as {
        expoConfig: { extra: Record<string, unknown> };
      }
    ).expoConfig.extra = {
      privacyUrl: "https://example.com/privacy",
    };

    const openURLSpy = jest
      .spyOn(Linking, "openURL")
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    const { getByText } = renderWithTheme(
      <PaywallCard balance={2} allocation={5} renewalAt={null} />,
    );

    fireEvent.press(getByText("Terms"));
    fireEvent.press(getByText("Privacy"));

    expect(openURLSpy).toHaveBeenNthCalledWith(1, "https://example.com/terms");
    expect(openURLSpy).toHaveBeenNthCalledWith(
      2,
      "https://example.com/privacy",
    );

    openURLSpy.mockRestore();
  });
});
