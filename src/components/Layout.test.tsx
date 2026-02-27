import { Text } from "react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Layout } from "@/components/Layout";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockUseE2ENetInfo = jest.fn<() => { isConnected: boolean | null }>();

jest.mock("react-native-gesture-handler", () => {
  const { ScrollView } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { __esModule: true, ScrollView };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/services/e2e/connectivity", () => ({
  useE2ENetInfo: () => mockUseE2ENetInfo(),
}));

jest.mock("@/components/BottomTabBar", () => ({
  __esModule: true,
  default: () => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text: RNText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(RNText, null, "bottom-tab-bar");
  },
}));

jest.mock("@/components/OfflineBanner", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Text: RNText } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const OfflineBanner = () => createElement(RNText, null, "offline-banner");
  return { __esModule: true, OfflineBanner, default: OfflineBanner };
});

describe("Layout", () => {
  it("renders content and bottom tab when navigation is enabled", () => {
    mockUseE2ENetInfo.mockReturnValue({ isConnected: true });
    const { getByText, queryByText } = renderWithTheme(
      <Layout>
        <Text>screen-content</Text>
      </Layout>,
    );

    expect(getByText("screen-content")).toBeTruthy();
    expect(getByText("bottom-tab-bar")).toBeTruthy();
    expect(queryByText("offline-banner")).toBeNull();
  });

  it("hides bottom tab when navigation is disabled", () => {
    mockUseE2ENetInfo.mockReturnValue({ isConnected: true });
    const { queryByText } = renderWithTheme(
      <Layout showNavigation={false}>
        <Text>screen-content</Text>
      </Layout>,
    );

    expect(queryByText("bottom-tab-bar")).toBeNull();
  });

  it("shows offline banner when disconnected", () => {
    mockUseE2ENetInfo.mockReturnValue({ isConnected: false });
    const { getByText } = renderWithTheme(
      <Layout>
        <Text>screen-content</Text>
      </Layout>,
    );

    expect(getByText("offline-banner")).toBeTruthy();
  });
});
