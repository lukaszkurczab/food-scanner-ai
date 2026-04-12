import React from "react";
import {
  Pressable as mockPressable,
  Text as mockText,
  View as mockView,
} from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import HomeScreen from "@/feature/Home/screens/HomeScreen";
import { createFallbackNutritionState } from "@/services/nutritionState/nutritionStateService";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockReact = React;

const mockUseMeals = jest.fn();
const mockUseNutritionState = jest.fn();
const mockUseUserProfileContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUsePremiumContext = jest.fn();
const mockUseMealAddMethodState = jest.fn();
const mockUseWeeklyReport = jest.fn();
const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

jest.mock("@/hooks/useMeals", () => ({
  useMeals: (uid: string | null | undefined) => mockUseMeals(uid),
}));

jest.mock("@/hooks/useNutritionState", () => ({
  useNutritionState: (params: { uid: string | null | undefined; dayKey?: string | null }) =>
    mockUseNutritionState(params),
}));

jest.mock("@/context/UserProfileContext", () => ({
  useUserProfileContext: () => mockUseUserProfileContext(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@/feature/Meals/hooks/useMealAddMethodState", () => ({
  useMealAddMethodState: (params: unknown) => mockUseMealAddMethodState(params),
}));

jest.mock("@/hooks/useWeeklyReport", () => ({
  useWeeklyReport: (params: unknown) => mockUseWeeklyReport(params),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (
      key: string,
      options?:
        | string
        | { count?: number; method?: string; defaultValue?: string; name?: string },
    ) => {
      if (typeof options === "string") {
        return options;
      }
      if (key === "meals:photoTitle") return "Photo";
      if (key === "meals:textTitle") return "Assistant";
      if (key === "meals:barcodeTitle") return "Barcode";
      if (key === "meals:savedTitle") return "Saved meals";
      if (key === "home:methodSelector") return `Method: ${options?.method}`;
      if (key === "home:mealCount") {
        return options?.count === 1 ? "1 meal" : `${options?.count ?? 0} meals`;
      }
      return options?.defaultValue ?? key;
    },
  }),
}));

jest.mock("@/components", () => {
  const { createElement, Fragment } =
    jest.requireActual<typeof import("react")>("react");
  const {
    Pressable: MockPressable,
    Text: MockText,
    View: MockView,
  } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    Layout: ({ children }: { children: React.ReactNode }) =>
      createElement(Fragment, null, children),
    Modal: ({
      visible,
      title,
      primaryAction,
      secondaryAction,
    }: {
      visible: boolean;
      title?: string;
      primaryAction?: { label: string; onPress?: () => void };
      secondaryAction?: { label: string; onPress?: () => void };
    }) =>
      visible
        ? createElement(
            MockView,
            null,
            title ? createElement(MockText, null, title) : null,
            primaryAction
              ? createElement(
                  MockPressable,
                  { onPress: primaryAction.onPress },
                  createElement(MockText, null, primaryAction.label),
                )
              : null,
            secondaryAction
              ? createElement(
                  MockPressable,
                  { onPress: secondaryAction.onPress },
                  createElement(MockText, null, secondaryAction.label),
                )
              : null,
          )
        : null,
  };
});

jest.mock("@/components/WeekStrip", () => ({
  __esModule: true,
  default: ({
    onSelect,
  }: {
    onSelect: (date: Date) => void;
  }) =>
    mockReact.createElement(
      mockPressable,
      { onPress: () => onSelect(new Date("2026-03-17T12:00:00.000Z")) },
      mockReact.createElement(mockText, null, "pick-2026-03-17"),
    ),
}));

jest.mock("../components/HomeHeroCard", () => ({
  __esModule: true,
  default: ({
    title,
    meta,
    ctaLabel,
    methodLabel,
    progress,
    supportText,
    onPressCta,
    onPressMethodSelector,
  }: {
    title: string;
    meta: string;
    ctaLabel: string;
    methodLabel?: string;
    progress?: number | null;
    supportText?: string | null;
    onPressCta: () => void;
    onPressMethodSelector?: () => void;
  }) =>
    mockReact.createElement(
      mockView,
      null,
      mockReact.createElement(mockText, null, title),
      mockReact.createElement(mockText, null, meta),
      mockReact.createElement(
        mockPressable,
        { onPress: onPressCta },
        mockReact.createElement(mockText, null, ctaLabel),
      ),
      methodLabel
        ? mockReact.createElement(
            mockPressable,
            { onPress: onPressMethodSelector },
            mockReact.createElement(mockText, null, methodLabel),
          )
        : null,
      typeof progress === "number"
        ? mockReact.createElement(
            mockText,
            null,
            `hero-progress:${progress.toFixed(2)}`,
          )
        : null,
      supportText
        ? mockReact.createElement(mockText, null, supportText)
        : null,
    ),
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

jest.mock("../components/TodaysMealsList", () => ({
  TodaysMealsList: ({ meals }: { meals: Array<unknown> }) =>
    mockReact.createElement(mockText, null, `meals:${meals.length}`),
}));

jest.mock("../components/WeeklyReportCard", () => ({
  __esModule: true,
  default: ({
    loading,
    onPress,
  }: {
    loading: boolean;
    onPress: () => void;
  }) =>
    mockReact.createElement(
      mockPressable,
      { onPress },
      mockReact.createElement(
        mockText,
        null,
        loading ? "weekly-report-card:loading" : "weekly-report-card:ready",
      ),
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

function createMeal(overrides: Record<string, unknown> = {}) {
  return {
    userUid: "user-1",
    mealId: "meal-1",
    timestamp: new Date("2026-03-18T10:00:00.000Z").getTime(),
    type: "breakfast",
    name: "Breakfast",
    ingredients: [],
    createdAt: "2026-03-18T10:00:00.000Z",
    updatedAt: "2026-03-18T10:00:00.000Z",
    syncState: "synced",
    source: "manual",
    totals: { kcal: 500, protein: 25, fat: 15, carbs: 45 },
    ...overrides,
  };
}

describe("HomeScreen", () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-18T08:00:00.000Z"));
    jest.clearAllMocks();

    mockUseUserProfileContext.mockReturnValue({
      userData: {
        username: "Anna",
        surveyComplited: true,
        calorieTarget: 2000,
        preferences: [],
        goal: "maintain",
      },
    });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUsePremiumContext.mockReturnValue({ isPremium: true });
    mockUseMeals.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
    });
    mockUseMealAddMethodState.mockReturnValue({
      preferredOption: {
        key: "photo",
        icon: "camera",
        titleKey: "photoTitle",
      },
      showResumeModal: false,
      handleDirectStart: jest.fn(async () => undefined),
      handleContinueDraft: jest.fn(async () => undefined),
      handleDiscardDraft: jest.fn(async () => undefined),
      closeResumeModal: jest.fn(),
    });

    const fallbackState = createFallbackNutritionState("2026-03-18");
    mockUseNutritionState.mockReturnValue({
      state: fallbackState,
      enabled: false,
      source: "disabled",
    });
    mockUseWeeklyReport.mockReturnValue({
      report: {
        status: "ready",
        period: { startDay: "2026-03-09", endDay: "2026-03-15" },
        summary: "Weekday rhythm carried most of the week.",
        insights: [],
        priorities: [],
      },
      loading: false,
      enabled: true,
      source: "remote",
      status: "live_success",
      error: null,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it("renders the empty today state and starts the preferred method from the hero CTA", async () => {
    const navigation = createNavigation();
    const handleDirectStart = jest.fn(async () => undefined);
    mockUseMealAddMethodState.mockReturnValue({
      preferredOption: {
        key: "photo",
        icon: "camera",
        titleKey: "photoTitle",
      },
      showResumeModal: false,
      handleDirectStart,
      handleContinueDraft: jest.fn(async () => undefined),
      handleDiscardDraft: jest.fn(async () => undefined),
      closeResumeModal: jest.fn(),
    });

    const { getByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    expect(getByText("Good morning, Anna")).toBeTruthy();
    expect(getByText("Log breakfast")).toBeTruthy();
    expect(getByText("Method: Photo")).toBeTruthy();
    expect(
      getByText("Start with your first meal and the rest of today will build from there."),
    ).toBeTruthy();
    expect(getByText("weekly-report-card:ready")).toBeTruthy();
    expect(queryByText("meals:1")).toBeNull();

    fireEvent.press(getByText("Log breakfast"));

    await waitFor(() => {
      expect(handleDirectStart).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(getByText("Method: Photo"));

    expect(navigation.navigate).toHaveBeenCalledWith("MealAddMethod", {
      selectionMode: "persistDefault",
    });

    fireEvent.press(getByText("weekly-report-card:ready"));
    expect(navigation.navigate).toHaveBeenCalledWith("WeeklyReport");
  });

  it("renders the in-progress today state with subtle progress and meals list", () => {
    mockUseMeals.mockReturnValue({
      meals: [createMeal()],
      getMeals: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    expect(getByText("Log next meal")).toBeTruthy();
    expect(getByText("hero-progress:0.25")).toBeTruthy();
    expect(getByText("macro-targets:125/65/225;consumed:25/15/45")).toBeTruthy();
    expect(getByText("meals:1")).toBeTruthy();
  });

  it("does not trigger an extra meals reload from the screen layer", async () => {
    const getMeals = jest.fn();
    mockUseMeals.mockReturnValue({
      meals: [createMeal()],
      getMeals,
    });

    const navigation = createNavigation();
    renderWithTheme(<HomeScreen navigation={navigation as never} />);

    await waitFor(() => {
      expect(mockUseMeals).toHaveBeenCalledWith("user-1");
    });

    expect(getMeals).not.toHaveBeenCalled();
  });

  it("hides weekly report card for free users", () => {
    mockUsePremiumContext.mockReturnValue({ isPremium: false });

    const navigation = createNavigation();
    const { queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    expect(queryByText("weekly-report-card:ready")).toBeNull();
    expect(queryByText("weekly-report-card:loading")).toBeNull();
  });

  it("switches to the past incomplete state for a previous day and requests the correct dayKey", async () => {
    const navigation = createNavigation();
    const { getByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    fireEvent.press(getByText("pick-2026-03-17"));

    await waitFor(() => {
      expect(mockUseNutritionState).toHaveBeenLastCalledWith({
        uid: "user-1",
        dayKey: "2026-03-17",
      });
    });

    expect(getByText("Add a missed meal")).toBeTruthy();
    expect(getByText("You missed a meal log")).toBeTruthy();
    expect(getByText("You can still fill in what was missing.")).toBeTruthy();
  });

  it("renders the completed state and routes the CTA to review flow instead of add flow", () => {
    mockUseMeals.mockReturnValue({
      meals: [createMeal()],
      getMeals: jest.fn(),
    });

    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.targets.kcal = 2000;
    remoteState.targets.protein = 150;
    remoteState.targets.fat = 70;
    remoteState.targets.carbs = 180;
    remoteState.consumed.kcal = 2100;
    remoteState.consumed.protein = 152;
    remoteState.consumed.fat = 68;
    remoteState.consumed.carbs = 243;

    mockUseNutritionState.mockReturnValue({
      state: remoteState,
      enabled: true,
      source: "remote",
    });

    const navigation = createNavigation();
    const { getByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    expect(getByText("Goal reached, Anna")).toBeTruthy();
    expect(getByText("Review your day")).toBeTruthy();
    expect(queryByText("Method: Photo")).toBeNull();

    fireEvent.press(getByText("Review your day"));
    expect(navigation.navigate).toHaveBeenCalledWith("HistoryList");
  });
});
