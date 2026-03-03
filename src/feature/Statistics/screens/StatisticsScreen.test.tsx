import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import StatisticsScreen from "@/feature/Statistics/screens/StatisticsScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type DateInputProps = {
  range: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
};

const mockUseUserContext = jest.fn();
const mockUsePremiumContext = jest.fn();
const mockUseStatisticsState = jest.fn();

jest.mock("@contexts/UserContext", () => ({
  useUserContext: () => mockUseUserContext(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@/feature/Statistics/hooks/useStatisticsState", () => ({
  useStatisticsState: (params: unknown) => mockUseStatisticsState(params),
}));

jest.mock("@/services/mealService", () => ({
  FREE_WINDOW_DAYS: 30,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { defaultValue?: string; d?: number } | string,
    ) =>
      typeof options === "string"
        ? options
        : options?.defaultValue ??
          (typeof options?.d === "number" ? `${key}:${options.d}` : key),
  }),
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
    DateInput: ({ range, onChange }: DateInputProps) =>
      createElement(
        Pressable,
        {
          onPress: () =>
            onChange({
              start: new Date("2026-01-01T00:00:00.000Z"),
              end: new Date("2026-01-10T00:00:00.000Z"),
            }),
        },
        createElement(
          Text,
          null,
          `date-input:${range.start.toISOString()}:${range.end.toISOString()}`,
        ),
      ),
  };
});

jest.mock("@/components/PrimaryButton", () => ({
  PrimaryButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      Pressable,
      { onPress, accessibilityRole: "button" },
      createElement(Text, null, label),
    );
  },
}));

jest.mock("../components/RangeTabs", () => ({
  RangeTabs: ({
    options,
    active,
    onChange,
  }: {
    options: Array<{ key: string; label: string }>;
    active: string;
    onChange: (key: string) => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, `active-range:${active}`),
      ...options.map((option) =>
        createElement(
          Pressable,
          { key: option.key, onPress: () => onChange(option.key) },
          createElement(Text, null, option.label),
        ),
      ),
    );
  },
}));

jest.mock("../components/MetricsGrid", () => ({
  MetricsGrid: ({
    selected,
    onSelect,
  }: {
    selected: string;
    onSelect: (value: string) => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, `metric:${selected}`),
      createElement(
        Pressable,
        { onPress: () => onSelect("protein") },
        createElement(Text, null, "select-protein"),
      ),
    );
  },
}));

jest.mock("../components/LineSection", () => ({
  LineSection: ({ metric }: { metric: string }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `line-section:${metric}`);
  },
}));

jest.mock("../components/MacroPieCard", () => ({
  MacroPieCard: ({ protein }: { protein: number }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `macro-pie:${protein}`);
  },
}));

jest.mock("../components/ProgressAveragesCard", () => ({
  ProgressAveragesCard: ({ avgKcal }: { avgKcal: number }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `progress-card:${avgKcal}`);
  },
}));

describe("StatisticsScreen", () => {
  beforeEach(() => {
    mockUseUserContext.mockReturnValue({
      userData: { uid: "user-1", calorieTarget: 2200 },
    });
    mockUsePremiumContext.mockReturnValue({ isPremium: false });
  });

  it("renders loading and empty states with their CTAs", () => {
    const navigation = { navigate: jest.fn() };
    mockUseStatisticsState
      .mockReturnValueOnce({
        active: "7d",
        setActive: jest.fn(),
        customRange: {
          start: new Date("2026-01-01T00:00:00.000Z"),
          end: new Date("2026-01-07T00:00:00.000Z"),
        },
        setCustomRange: jest.fn(),
        isWindowLimited: false,
        loadingMeals: true,
        empty: false,
      })
      .mockReturnValueOnce({
        active: "7d",
        setActive: jest.fn(),
        customRange: {
          start: new Date("2026-01-01T00:00:00.000Z"),
          end: new Date("2026-01-07T00:00:00.000Z"),
        },
        setCustomRange: jest.fn(),
        isWindowLimited: false,
        loadingMeals: false,
        empty: true,
      });

    const loading = renderWithTheme(
      <StatisticsScreen navigation={navigation as never} />,
    );
    expect(loading.getByText("common:loading")).toBeTruthy();

    const empty = renderWithTheme(
      <StatisticsScreen navigation={navigation as never} />,
    );
    fireEvent.press(empty.getByText("statistics:empty.cta"));
    expect(navigation.navigate).toHaveBeenCalledWith("MealAddMethod");
  });

  it("renders premium banner, custom range controls and statistics cards", () => {
    const navigation = { navigate: jest.fn() };
    const setActive = jest.fn();
    const setCustomRange = jest.fn();
    const setMetric = jest.fn();
    mockUseStatisticsState.mockReturnValue({
      active: "custom",
      setActive,
      customRange: {
        start: new Date("2026-01-01T00:00:00.000Z"),
        end: new Date("2026-01-07T00:00:00.000Z"),
      },
      setCustomRange,
      isWindowLimited: true,
      loadingMeals: false,
      empty: false,
      avgKcal: 2100,
      kcalSeries: [2000, 2200],
      days: 7,
      totalKcal: 14700,
      avgProtein: 140,
      avgCarbs: 180,
      avgFat: 70,
      metric: "kcal",
      setMetric,
      showLineSection: true,
      labels: ["Mon", "Tue"],
      selectedSeries: [2000, 2200],
      hasTotals: true,
      totals: { protein: 140, carbs: 180, fat: 70 },
    });

    const { getByText } = renderWithTheme(
      <StatisticsScreen navigation={navigation as never} />,
    );

    fireEvent.press(getByText("statistics:ranges.30d"));
    fireEvent.press(
      getByText(
        "date-input:2026-01-01T00:00:00.000Z:2026-01-07T00:00:00.000Z",
      ),
    );
    fireEvent.press(getByText("select-protein"));
    fireEvent.press(getByText("Odblokuj Premium"));

    expect(getByText("progress-card:2100")).toBeTruthy();
    expect(getByText("line-section:kcal")).toBeTruthy();
    expect(getByText("macro-pie:140")).toBeTruthy();
    expect(setActive).toHaveBeenCalledWith("30d");
    expect(setCustomRange).toHaveBeenCalledWith({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-10T00:00:00.000Z"),
    });
    expect(setMetric).toHaveBeenCalledWith("protein");
    expect(navigation.navigate).toHaveBeenCalledWith("ManageSubscription");
  });
});
