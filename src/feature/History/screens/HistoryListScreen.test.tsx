import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ActivityIndicator } from "react-native";
import HistoryListScreen from "@/feature/History/screens/HistoryListScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockUseHistoryListState = jest.fn();

jest.mock("@/feature/History/hooks/useHistoryListState", () => ({
  useHistoryListState: (params: unknown) => mockUseHistoryListState(params),
}));

jest.mock("@/services/meals/mealService", () => ({
  FREE_WINDOW_DAYS: 30,
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: React.ReactNode }) =>
      createElement(View, null, children),
    SearchBox: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (value: string) => void;
    }) =>
      createElement(
        Pressable,
        { onPress: () => onChange("updated query") },
        createElement(Text, null, `search:${value}`),
      ),
  };
});

jest.mock("../components/EmptyState", () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, `empty-title:${title}`),
      createElement(Text, null, `empty-description:${description}`),
    );
  },
}));

jest.mock("../components/LoadingSkeleton", () => ({
  LoadingSkeleton: ({ height }: { height: number }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, `loading-skeleton:${height}`);
  },
}));

jest.mock("../components/FilterBadgeButton", () => ({
  FilterBadgeButton: ({
    activeCount,
    onPress,
  }: {
    activeCount: number;
    onPress: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      Pressable,
      { onPress },
      createElement(Text, null, `filter-badge:${activeCount}`),
    );
  },
}));

jest.mock("../components/FilterPanel", () => ({
  FilterPanel: ({
    scope,
    isPremium,
    windowDays,
    onUpgrade,
  }: {
    scope: string;
    isPremium?: boolean;
    windowDays?: number;
    onUpgrade?: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(
        Text,
        null,
        `filter-panel:${scope}:${String(isPremium)}:${String(windowDays)}`,
      ),
      onUpgrade
        ? createElement(
            Pressable,
            { onPress: onUpgrade },
            createElement(Text, null, "upgrade-history"),
          )
        : null,
    );
  },
}));

jest.mock("@/components/MealListItem", () => ({
  MealListItem: ({
    meal,
    onPress,
  }: {
    meal: { name?: string };
    onPress: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      Pressable,
      { onPress },
      createElement(Text, null, `meal:${meal.name ?? ""}`),
    );
  },
}));

describe("HistoryListScreen", () => {
  beforeEach(() => {
    mockUseHistoryListState.mockReset();
  });

  it("renders loading and non-ready states", () => {
    const setQuery = jest.fn();
    const onUpgrade = jest.fn();

    mockUseHistoryListState
      .mockReturnValueOnce({
        dataState: "loading",
      })
      .mockReturnValueOnce({
        dataState: "error",
        showFilters: false,
        query: "salad",
        setQuery,
        emptyState: {
          title: "Nothing found",
          description: "Try again later",
        },
      })
      .mockReturnValueOnce({
        dataState: "offline-empty",
        showFilters: true,
        isPremium: false,
        onUpgrade,
      });

    const loading = renderWithTheme(
      <HistoryListScreen navigation={{} as never} />,
    );
    expect(loading.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    const empty = renderWithTheme(
      <HistoryListScreen navigation={{} as never} />,
    );
    expect(empty.getByText("search:salad")).toBeTruthy();
    expect(empty.getByText("empty-title:Nothing found")).toBeTruthy();
    fireEvent.press(empty.getByText("search:salad"));
    expect(setQuery).toHaveBeenCalledWith("updated query");

    const filters = renderWithTheme(
      <HistoryListScreen navigation={{} as never} />,
    );
    expect(filters.getByText("filter-panel:history:false:30")).toBeTruthy();
    fireEvent.press(filters.getByText("upgrade-history"));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("renders ready list state and forwards actions", () => {
    const toggleShowFilters = jest.fn();
    const onMealPress = jest.fn();
    const refresh = jest.fn();
    const onEndReached = jest.fn();

    mockUseHistoryListState.mockReturnValue({
      dataState: "ready",
      showFilters: false,
      query: "",
      setQuery: jest.fn(),
      filterCount: 2,
      toggleShowFilters,
      sections: [
        {
          title: "Today",
          totalKcal: 720,
          data: [
            { mealId: "meal-1", name: "Chicken bowl" },
            { mealId: "meal-2", name: "Apple pie" },
          ],
        },
      ],
      keyExtractor: (item: { mealId: string }) => item.mealId,
      loading: false,
      loadingMore: true,
      refresh,
      onEndReached,
      onMealPress,
      kcalLabel: "kcal",
      isPremium: true,
    });

    const screen = renderWithTheme(
      <HistoryListScreen navigation={{} as never} />,
    );

    expect(screen.getByText("search:")).toBeTruthy();
    expect(screen.getByText("filter-badge:2")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("720 kcal")).toBeTruthy();
    expect(screen.getByText("meal:Chicken bowl")).toBeTruthy();
    expect(screen.getByText("meal:Apple pie")).toBeTruthy();
    expect(screen.getByText("loading-skeleton:56")).toBeTruthy();

    fireEvent.press(screen.getByText("filter-badge:2"));
    fireEvent.press(screen.getByText("meal:Chicken bowl"));

    expect(toggleShowFilters).toHaveBeenCalledTimes(1);
    expect(onMealPress).toHaveBeenCalledWith({
      mealId: "meal-1",
      name: "Chicken bowl",
    });
    expect(onEndReached).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders ready filters view", () => {
    mockUseHistoryListState.mockReturnValue({
      dataState: "ready",
      showFilters: true,
      isPremium: true,
      onUpgrade: jest.fn(),
    });

    const screen = renderWithTheme(
      <HistoryListScreen navigation={{} as never} />,
    );

    expect(screen.getByText("filter-panel:history:true:30")).toBeTruthy();
  });
});
