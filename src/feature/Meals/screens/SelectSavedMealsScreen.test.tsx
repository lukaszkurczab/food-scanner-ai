import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import SelectSavedMealScreen from "@/feature/Meals/screens/SelectSavedMealsScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

const mockUseAuthContext = jest.fn();
const mockUseMeals = jest.fn();
const mockUseMealDraftContext = jest.fn();
const mockUseSelectSavedMealsState = jest.fn();

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@hooks/useMeals", () => ({
  useMeals: (uid: string | null) => mockUseMeals(uid),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@/feature/Meals/hooks/useSelectSavedMealsState", () => ({
  useSelectSavedMealsState: (params: unknown) =>
    mockUseSelectSavedMealsState(params),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
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
    FullScreenLoader: () => createElement(Text, null, "full-screen-loader"),
    PrimaryButton: ({ label, onPress, disabled }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    SecondaryButton: ({ label, onPress }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

jest.mock("@/components/SearchBox", () => ({
  SearchBox: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, `search:${value}`),
      createElement(
        Pressable,
        { onPress: () => onChange("pasta") },
        createElement(Text, null, "change-search"),
      ),
    );
  },
}));

jest.mock("@/components/MealListItem", () => ({
  MealListItem: ({
    meal,
    onPress,
  }: {
    meal: Meal;
    onPress: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      Pressable,
      { onPress },
      createElement(Text, null, meal.name ?? "unnamed-meal"),
    );
  },
}));

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
      createElement(Text, null, title),
      createElement(Text, null, description),
    );
  },
}));

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-01-10T12:00:00.000Z",
  type: "dinner",
  name: "Chicken pasta",
  ingredients: [],
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  syncState: "synced",
  source: "saved",
  ...overrides,
});

describe("SelectSavedMealScreen", () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseMeals.mockReturnValue({ getMeals: jest.fn(async () => undefined) });
    mockUseMealDraftContext.mockReturnValue({
      meal: null,
      setMeal: jest.fn(),
      saveDraft: jest.fn(async () => undefined),
      setLastScreen: jest.fn(async () => undefined),
    });
  });

  it("shows the loader while data is loading", () => {
    mockUseSelectSavedMealsState.mockReturnValue({
      step: 20,
      queryText: "",
      setQueryText: jest.fn(),
      loading: true,
      pageItems: [],
      selectedId: null,
      refresh: jest.fn(),
      handleSelect: jest.fn(),
      handleConfirm: jest.fn(),
      handleStartOver: jest.fn(),
      keyExtractor: jest.fn(),
      onViewableItemsChanged: { current: jest.fn() },
      viewabilityConfig: {},
    });

    const { getByText } = renderWithTheme(
      <SelectSavedMealScreen navigation={{} as never} />,
    );

    expect(getByText("full-screen-loader")).toBeTruthy();
  });

  it("shows the empty state and supports starting over", () => {
    const handleStartOver = jest.fn();
    const setQueryText = jest.fn();
    mockUseSelectSavedMealsState.mockReturnValue({
      step: 20,
      queryText: "",
      setQueryText,
      loading: false,
      pageItems: [],
      selectedId: null,
      refresh: jest.fn(),
      handleSelect: jest.fn(),
      handleConfirm: jest.fn(),
      handleStartOver,
      keyExtractor: jest.fn(),
      onViewableItemsChanged: { current: jest.fn() },
      viewabilityConfig: {},
    });

    const { getByText } = renderWithTheme(
      <SelectSavedMealScreen navigation={{} as never} />,
    );

    fireEvent.press(getByText("change-search"));
    fireEvent.press(getByText("Start over"));

    expect(getByText("No saved meals")).toBeTruthy();
    expect(setQueryText).toHaveBeenCalledWith("pasta");
    expect(handleStartOver).toHaveBeenCalledTimes(1);
  });

  it("renders meals list and wires selection plus confirm actions", () => {
    const handleSelect = jest.fn();
    const handleConfirm = jest.fn();
    mockUseSelectSavedMealsState.mockReturnValue({
      step: 20,
      queryText: "chi",
      setQueryText: jest.fn(),
      loading: false,
      pageItems: [buildMeal()],
      selectedId: "meal-1",
      refresh: jest.fn(),
      handleSelect,
      handleConfirm,
      handleStartOver: jest.fn(),
      keyExtractor: (meal: Meal) => meal.mealId,
      onViewableItemsChanged: { current: jest.fn() },
      viewabilityConfig: {},
    });

    const { getByText } = renderWithTheme(
      <SelectSavedMealScreen navigation={{} as never} />,
    );

    fireEvent.press(getByText("Chicken pasta"));
    fireEvent.press(getByText("Select"));

    expect(getByText("search:chi")).toBeTruthy();
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Chicken pasta" }),
    );
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
