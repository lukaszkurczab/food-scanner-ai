import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import StatisticsScreen from "@/feature/Statistics/screens/StatisticsScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { DateRange } from "@/feature/Statistics/types";

const mockUseUserContext = jest.fn();
const mockUsePremiumContext = jest.fn();
const mockUseStatisticsState = jest.fn();
const mockUseNetInfo = jest.fn();

jest.mock("@contexts/UserContext", () => ({
  useUserContext: () => mockUseUserContext(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("@/feature/Statistics/hooks/useStatisticsState", () => ({
  useStatisticsState: (params: unknown) => mockUseStatisticsState(params),
}));

jest.mock("@/services/meals/mealService", () => ({
  FREE_WINDOW_DAYS: 30,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (
      key: string,
      options?: { defaultValue?: string; days?: number } | string,
    ) =>
      typeof options === "string"
        ? options
        : options?.defaultValue ??
          (typeof options?.days === "number" ? `${key}:${options.days}` : key),
  }),
}));

jest.mock("@/components", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Text, View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) => createElement(View, null, children),
    FullScreenLoader: ({ label }: { label?: string }) =>
      createElement(Text, null, `loader:${label ?? ""}`),
    Calendar: () => null,
    Modal: ({ children }: { children?: ReactNode }) => createElement(View, null, children),
    PieChart: () => null,
  };
});

jest.mock("@/feature/Statistics/components/StatisticsRangeSwitcher", () => ({
  StatisticsRangeSwitcher: ({
    options,
    onChange,
  }: {
    options: Array<{ key: string; label: string }>;
    onChange: (key: string) => void;
  }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } = jest.requireActual<typeof import("react-native")>(
      "react-native",
    );

    return createElement(
      View,
      null,
      ...options.map((option) =>
        createElement(
          Pressable,
          {
            key: option.key,
            onPress: () => onChange(option.key),
          },
          createElement(Text, null, option.label),
        ),
      ),
    );
  },
}));

jest.mock("@/feature/Statistics/components/StatisticsCustomRangeControl", () => ({
  StatisticsCustomRangeControl: ({
    onApply,
  }: {
    onApply: (range: DateRange) => void;
  }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
      "react-native",
    );

    return createElement(
      Pressable,
      {
        onPress: () =>
          onApply({
            start: new Date("2026-03-01T00:00:00.000Z"),
            end: new Date("2026-03-10T00:00:00.000Z"),
          }),
      },
      createElement(Text, null, "apply-custom-range"),
    );
  },
}));

jest.mock("@/feature/Statistics/components/StatisticsTrendCard", () => ({
  StatisticsTrendCard: () => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "trend-card");
  },
}));

jest.mock("@/feature/Statistics/components/StatisticsDailyAveragesSection", () => ({
  StatisticsDailyAveragesSection: () => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "daily-averages");
  },
}));

jest.mock("@/feature/Statistics/components/StatisticsMacroBreakdownCard", () => ({
  StatisticsMacroBreakdownCard: () => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "macro-breakdown");
  },
}));

jest.mock("@/feature/Statistics/components/StatisticsPremiumBanner", () => ({
  StatisticsPremiumBanner: ({ onPress }: { onPress: () => void }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
      "react-native",
    );

    return createElement(
      Pressable,
      { onPress },
      createElement(Text, null, "premium-banner"),
    );
  },
}));

jest.mock("@/feature/Statistics/components/StatisticsEmptyState", () => ({
  StatisticsEmptyState: ({
    kind,
    isOffline,
  }: {
    kind: string;
    isOffline: boolean;
  }) => {
    const { createElement } = jest.requireActual<typeof import("react")>("react");
    const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `empty:${kind}:${String(isOffline)}`);
  },
}));

function makeAnalyticsState(overrides: Record<string, unknown> = {}) {
  return {
    active: "7d",
    setActive: jest.fn(),
    customRange: {
      start: new Date("2026-03-01T00:00:00.000Z"),
      end: new Date("2026-03-07T00:00:00.000Z"),
    },
    setCustomRange: jest.fn(),
    metric: "kcal",
    setMetric: jest.fn(),
    loadingMeals: false,
    emptyKind: "none",
    labels: ["Mon", "Tue"],
    selectedSeries: [1200, 1500],
    metricAverage: 1400,
    totals: { protein: 80, carbs: 150, fat: 50 },
    hasTotals: true,
    avgKcal: 1400,
    avgProtein: 80,
    avgCarbs: 150,
    avgFat: 50,
    isWindowLimited: false,
    ...overrides,
  };
}

describe("StatisticsScreen", () => {
  beforeEach(() => {
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUseUserContext.mockReturnValue({
      userData: { uid: "user-1", calorieTarget: 2200 },
    });
    mockUsePremiumContext.mockReturnValue({ isPremium: false });
  });

  it("renders loading state", () => {
    const navigation = { navigate: jest.fn() };
    mockUseStatisticsState.mockReturnValue(
      makeAnalyticsState({
        loadingMeals: true,
      }),
    );

    const { getByText } = renderWithTheme(
      <StatisticsScreen navigation={navigation as never} />,
    );

    expect(getByText("loader:common:loading")).toBeTruthy();
  });

  it("renders analytics content and premium banner when limited", () => {
    const navigation = { navigate: jest.fn() };
    const setActive = jest.fn();
    const setCustomRange = jest.fn();

    mockUseStatisticsState.mockReturnValue(
      makeAnalyticsState({
        active: "custom",
        setActive,
        setCustomRange,
        isWindowLimited: true,
      }),
    );

    const { getByText } = renderWithTheme(
      <StatisticsScreen navigation={navigation as never} />,
    );

    expect(getByText("trend-card")).toBeTruthy();
    expect(getByText("daily-averages")).toBeTruthy();
    expect(getByText("macro-breakdown")).toBeTruthy();

    fireEvent.press(getByText("statistics:ranges.30d"));
    fireEvent.press(getByText("apply-custom-range"));
    fireEvent.press(getByText("premium-banner"));

    expect(setActive).toHaveBeenCalledWith("30d");
    expect(setCustomRange).toHaveBeenCalledWith({
      start: new Date("2026-03-01T00:00:00.000Z"),
      end: new Date("2026-03-10T00:00:00.000Z"),
    });
    expect(navigation.navigate).toHaveBeenCalledWith("ManageSubscription");
  });

  it("renders offline no-history empty state", () => {
    const navigation = { navigate: jest.fn() };
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    mockUseStatisticsState.mockReturnValue(
      makeAnalyticsState({
        emptyKind: "no_history",
      }),
    );

    const { getByText } = renderWithTheme(
      <StatisticsScreen navigation={navigation as never} />,
    );

    expect(getByText("empty:no_history:true")).toBeTruthy();
  });
});
