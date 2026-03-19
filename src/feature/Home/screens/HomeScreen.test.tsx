import React from "react";
import {
  Pressable as mockPressable,
  Text as mockText,
  View as mockView,
} from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import HomeScreen from "@/feature/Home/screens/HomeScreen";
import { createFallbackNutritionState } from "@/services/nutritionState/nutritionStateService";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockReact = React;

const mockUseMeals = jest.fn();
const mockUseNutritionState = jest.fn();
const mockUseUserContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockSubscribeStreak = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

jest.mock("@/hooks/useMeals", () => ({
  useMeals: (uid: string | null | undefined) => mockUseMeals(uid),
}));

jest.mock("@/hooks/useNutritionState", () => ({
  useNutritionState: (params: { uid: string | null | undefined; dayKey?: string | null }) =>
    mockUseNutritionState(params),
}));

jest.mock("@contexts/UserContext", () => ({
  useUserContext: () => mockUseUserContext(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/services/gamification/streakService", () => ({
  subscribeStreak: (uid: string, onChange: (value: { current?: number }) => void) =>
    mockSubscribeStreak(uid, onChange),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }) => {
      if (typeof fallback === "string") {
        return fallback;
      }
      return fallback?.defaultValue ?? _key;
    },
  }),
}));

jest.mock("@/components", () => ({
  Layout: ({ children }: { children: React.ReactNode }) =>
    mockReact.createElement(mockReact.Fragment, null, children),
  TargetProgressBar: ({ current, target }: { current: number; target: number }) => (
    mockReact.createElement(
      mockText,
      null,
      `progress:${current}/${target}`,
    )
  ),
  PrimaryButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) =>
    mockReact.createElement(
      mockPressable,
      { onPress },
      mockReact.createElement(mockText, null, label),
    ),
}));

jest.mock("@/components/WeekStrip", () => ({
  __esModule: true,
  default: ({
    onSelect,
  }: {
    onSelect: (date: Date) => void;
  }) =>
    mockReact.createElement(
      mockView,
      null,
      mockReact.createElement(
        mockPressable,
        { onPress: () => onSelect(new Date("2026-03-17T12:00:00.000Z")) },
        mockReact.createElement(mockText, null, "pick-2026-03-17"),
      ),
    ),
}));

jest.mock("@components/StreakBadge", () => ({
  StreakBadge: ({ value }: { value: number }) =>
    mockReact.createElement(mockText, null, `streak:${value}`),
}));

jest.mock("../components/TodaysMealsList", () => ({
  TodaysMealsList: ({ meals }: { meals: Array<unknown> }) =>
    mockReact.createElement(mockText, null, `meals:${meals.length}`),
}));

jest.mock("../components/ButtonSection", () => ({
  ButtonSection: () =>
    mockReact.createElement(mockText, null, "button-section"),
}));

jest.mock("../components/WeeklyProgressGraph", () => ({
  WeeklyProgressGraph: () =>
    mockReact.createElement(mockText, null, "weekly-graph"),
}));

jest.mock("../components/EmptyDayView", () => ({
  __esModule: true,
  default: () =>
    mockReact.createElement(mockText, null, "empty-day"),
}));

jest.mock("../components/MacroTargetsRow", () => ({
  MacroTargetsRow: ({
    macroTargets,
    consumed,
  }: {
    macroTargets: { proteinGrams: number; fatGrams: number; carbsGrams: number };
    consumed: { protein: number; fat: number; carbs: number };
  }) =>
    mockReact.createElement(
      mockText,
      null,
      `macro-targets:${macroTargets.proteinGrams}/${macroTargets.fatGrams}/${macroTargets.carbsGrams};consumed:${consumed.protein}/${consumed.fat}/${consumed.carbs}`,
    ),
}));

type NavigationMock = {
  navigate: jest.Mock;
};

function createNavigation(): NavigationMock {
  return {
    navigate: jest.fn(),
  };
}

function createMeal() {
  return {
    id: "meal-1",
    timestamp: new Date("2026-03-18T10:00:00.000Z").getTime(),
    totals: { kcal: 500, protein: 25, fat: 15, carbs: 45 },
    ingredients: [],
  };
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-18T12:00:00.000Z"));
    jest.clearAllMocks();

    mockUseUserContext.mockReturnValue({
      userData: {
        surveyComplited: true,
        calorieTarget: 2000,
        preferences: [],
        goal: "maintain",
      },
    });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseMeals.mockReturnValue({
      meals: [createMeal()],
      getMeals: jest.fn(),
    });
    mockSubscribeStreak.mockImplementation(
      (...args: unknown[]) => {
        const onChange = args[1] as (value: { current?: number }) => void;
        onChange({ current: 4 });
        return () => undefined;
      },
    );

    const fallbackState = createFallbackNutritionState("2026-03-18");
    mockUseNutritionState.mockReturnValue({
      state: fallbackState,
      loading: false,
      enabled: false,
      source: "disabled",
      isStale: true,
      error: null,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses nutrition state for progress and summary when the state is available", async () => {
    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.targets.kcal = 2000;
    remoteState.targets.protein = 150;
    remoteState.targets.fat = 70;
    remoteState.targets.carbs = 180;
    remoteState.consumed.kcal = 1600;
    remoteState.consumed.protein = 120;
    remoteState.consumed.fat = 60;
    remoteState.consumed.carbs = 150;
    remoteState.remaining.kcal = 400;
    remoteState.quality.dataCompletenessScore = 0.75;
    remoteState.habits.topRisk = "under_logging";
    remoteState.habits.coachPriority = "logging_foundation";
    remoteState.streak.current = 7;
    remoteState.targets.kcal = 2100;

    mockUseNutritionState.mockReturnValue({
      state: remoteState,
      loading: false,
      enabled: true,
      source: "remote",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText, queryByTestId } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("progress:1600/2100")).toBeTruthy();
    });

    expect(getByText("macro-targets:150/70/180;consumed:120/60/150")).toBeTruthy();
    expect(getByText("meals:1")).toBeTruthy();
    expect(getByText("streak:7")).toBeTruthy();
    expect(queryByTestId("home-nutrition-summary")).not.toBeNull();
    expect(getByText("400 kcal left • 75% complete • Under logging")).toBeTruthy();
  });

  it("falls back to legacy meal totals when nutrition state is disabled", async () => {
    const navigation = createNavigation();
    const { getByText, queryByTestId } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("progress:500/2000")).toBeTruthy();
    });

    expect(getByText("macro-targets:125/65/225;consumed:25/15/45")).toBeTruthy();
    expect(getByText("meals:1")).toBeTruthy();
    expect(queryByTestId("home-nutrition-summary")).toBeNull();
  });

  it("renders stale nutrition state explicitly when cached state is available", async () => {
    const staleState = createFallbackNutritionState("2026-03-18");
    staleState.targets.kcal = 2100;
    staleState.consumed.kcal = 1600;
    staleState.remaining.kcal = 500;
    staleState.quality.dataCompletenessScore = 0.75;

    mockUseNutritionState.mockReturnValue({
      state: staleState,
      loading: false,
      enabled: true,
      source: "storage",
      isStale: true,
      error: new Error("backend down"),
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText, queryByTestId } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("progress:1600/2100")).toBeTruthy();
    });

    expect(queryByTestId("home-nutrition-summary")).not.toBeNull();
    expect(getByText("Cached • 500 kcal left • 75% complete")).toBeTruthy();
  });

  it("maps the selected home day to the requested nutrition state dayKey", async () => {
    const navigation = createNavigation();
    const { getByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(mockUseNutritionState).toHaveBeenCalledWith({
        uid: "user-1",
        dayKey: "2026-03-18",
      });
    });

    fireEvent.press(getByText("pick-2026-03-17"));

    await waitFor(() => {
      expect(mockUseNutritionState).toHaveBeenLastCalledWith({
        uid: "user-1",
        dayKey: "2026-03-17",
      });
    });
  });
});
