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
import type { CoachResponse } from "@/services/coach/coachTypes";
import { createFallbackNutritionState } from "@/services/nutritionState/nutritionStateService";
import { createFallbackCoachResponse } from "@/services/coach/coachService";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockReact = React;

const mockUseMeals = jest.fn();
const mockUseNutritionState = jest.fn();
const mockUseCoach = jest.fn();
const mockUseWeeklyReport = jest.fn();
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

jest.mock("@/hooks/useCoach", () => ({
  useCoach: (params: { uid: string | null | undefined; dayKey?: string | null }) =>
    mockUseCoach(params),
}));

jest.mock("@/hooks/useWeeklyReport", () => ({
  useWeeklyReport: (params: {
    uid: string | null | undefined;
    weekEnd?: string | null;
    active?: boolean;
  }) => mockUseWeeklyReport(params),
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
  Button: ({
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
  default: ({
    mode,
    coachEmptyReason,
  }: {
    mode?: string;
    coachEmptyReason?: string | null;
  }) =>
    mockReact.createElement(
      mockText,
      null,
      `empty-day:${mode ?? "plain"}:${coachEmptyReason ?? "none"}`,
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

jest.mock("../components/CoachInsightCard", () => ({
  __esModule: true,
  default: ({
    insight,
    onPressCta,
  }: {
    insight: { type: string };
    onPressCta?: () => void;
  }) =>
    mockReact.createElement(
      mockView,
      null,
      mockReact.createElement(mockText, null, `coach-card:${insight.type}`),
      onPressCta
        ? mockReact.createElement(
            mockPressable,
            { onPress: onPressCta },
            mockReact.createElement(mockText, null, "coach-cta"),
          )
        : null,
    ),
}));

jest.mock("../components/WeeklyReportCard", () => ({
  __esModule: true,
  default: ({
    report,
    onPress,
  }: {
    report: { status: string };
    onPress: () => void;
  }) =>
    mockReact.createElement(
      mockView,
      null,
      mockReact.createElement(mockText, null, `weekly-report-card:${report.status}`),
      mockReact.createElement(
        mockPressable,
        { onPress },
        mockReact.createElement(mockText, null, "weekly-report-open"),
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

function createMeal() {
  return {
    id: "meal-1",
    timestamp: new Date("2026-03-18T10:00:00.000Z").getTime(),
    totals: { kcal: 500, protein: 25, fat: 15, carbs: 45 },
    ingredients: [],
  };
}

function createCoachResponse(overrides?: Partial<CoachResponse>): CoachResponse {
  const coach = createFallbackCoachResponse("2026-03-18");
  coach.meta.available = true;
  coach.topInsight = {
    id: "2026-03-18:under_logging",
    type: "under_logging",
    priority: 100,
    title: "Logging looks too light to coach well",
    body: "Log your next meal so today is easier to interpret and adjust.",
    actionLabel: "Log next meal",
    actionType: "log_next_meal",
    reasonCodes: ["valid_logging_days_7_low"],
    source: "rules",
    validUntil: "2026-03-18T23:59:59Z",
    confidence: 0.92,
    isPositive: false,
  };
  coach.insights = coach.topInsight ? [coach.topInsight] : [];
  return {
    ...coach,
    ...overrides,
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
    mockUseCoach.mockReturnValue({
      coach: createFallbackCoachResponse("2026-03-18"),
      loading: false,
      enabled: true,
      source: "fallback",
      status: "no_user",
      isStale: true,
      error: null,
      refresh: jest.fn(),
    });
    mockUseWeeklyReport.mockReturnValue({
      report: {
        status: "ready",
        period: { startDay: "2026-03-11", endDay: "2026-03-17" },
        summary: "Logging stayed steady across the week.",
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
    expect(getByText("400 kcal left • 75% complete")).toBeTruthy();
  });

  it("renders coach insight card for a day with data when top insight is available", async () => {
    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.targets.kcal = 2100;
    remoteState.consumed.kcal = 1600;
    remoteState.remaining.kcal = 500;
    remoteState.quality.dataCompletenessScore = 0.75;

    mockUseNutritionState.mockReturnValue({
      state: remoteState,
      loading: false,
      enabled: true,
      source: "remote",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseCoach.mockReturnValue({
      coach: createCoachResponse(),
      loading: false,
      enabled: true,
      source: "remote",
      status: "live_success",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("coach-card:under_logging")).toBeTruthy();
    });

    fireEvent.press(getByText("coach-cta"));
    expect(navigation.navigate).toHaveBeenCalledWith("MealAddMethod");
  });

  it("renders weekly report card on today and navigates to weekly report screen", async () => {
    const navigation = createNavigation();
    const { getByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("weekly-report-card:ready")).toBeTruthy();
    });

    fireEvent.press(getByText("weekly-report-open"));
    expect(navigation.navigate).toHaveBeenCalledWith("WeeklyReport");
  });

  it("does not render coach insight card from stale cache after a coach fetch failure", async () => {
    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.targets.kcal = 2100;
    remoteState.consumed.kcal = 1600;
    remoteState.remaining.kcal = 500;
    remoteState.quality.dataCompletenessScore = 0.75;

    mockUseNutritionState.mockReturnValue({
      state: remoteState,
      loading: false,
      enabled: true,
      source: "remote",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseCoach.mockReturnValue({
      coach: createCoachResponse(),
      loading: false,
      enabled: true,
      source: "storage",
      status: "stale_cache",
      isStale: true,
      error: new Error("backend down"),
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(queryByText("meals:1")).not.toBeNull();
    });

    expect(queryByText("coach-card:under_logging")).toBeNull();
  });

  it("does not render coach surfaces for invalid coach payloads", async () => {
    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.targets.kcal = 2100;
    remoteState.consumed.kcal = 1600;
    remoteState.remaining.kcal = 500;
    remoteState.quality.dataCompletenessScore = 0.75;

    mockUseMeals.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
    });
    mockUseNutritionState.mockReturnValue({
      state: remoteState,
      loading: false,
      enabled: true,
      source: "remote",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseCoach.mockReturnValue({
      coach: createCoachResponse({
        topInsight: null,
        insights: [],
        meta: {
          available: false,
          emptyReason: null,
          isDegraded: false,
        },
      }),
      loading: false,
      enabled: true,
      source: "fallback",
      status: "invalid_payload",
      isStale: true,
      error: new Error("coach/invalid-contract-payload"),
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("empty-day:plain:none")).toBeTruthy();
    });

    expect(queryByText("coach-card:under_logging")).toBeNull();
  });

  it("does not render coach surfaces for disabled or fallback coach states", async () => {
    const remoteState = createFallbackNutritionState("2026-03-18");
    remoteState.targets.kcal = 2100;
    remoteState.consumed.kcal = 1600;
    remoteState.remaining.kcal = 500;
    remoteState.quality.dataCompletenessScore = 0.75;

    mockUseMeals.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
    });
    mockUseNutritionState.mockReturnValue({
      state: remoteState,
      loading: false,
      enabled: true,
      source: "remote",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });

    mockUseCoach.mockReturnValueOnce({
      coach: createFallbackCoachResponse("2026-03-18"),
      loading: false,
      enabled: false,
      source: "disabled",
      status: "disabled",
      isStale: true,
      error: null,
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const disabledRender = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(disabledRender.getByText("empty-day:plain:none")).toBeTruthy();
    });

    expect(disabledRender.queryByText("coach-card:under_logging")).toBeNull();

    mockUseCoach.mockReturnValueOnce({
      coach: createFallbackCoachResponse("2026-03-18"),
      loading: false,
      enabled: true,
      source: "fallback",
      status: "service_unavailable",
      isStale: true,
      error: new Error("backend down"),
      refresh: jest.fn(),
    });

    const fallbackRender = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(fallbackRender.getByText("empty-day:plain:none")).toBeTruthy();
    });

    expect(fallbackRender.queryByText("coach-card:under_logging")).toBeNull();
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

  it("does not render a separate coach card on an empty day and passes empty reason into the empty state", async () => {
    mockUseMeals.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
    });
    mockUseCoach.mockReturnValue({
      coach: createCoachResponse({
        topInsight: null,
        insights: [],
        meta: {
          available: true,
          emptyReason: "no_data",
          isDegraded: false,
        },
      }),
      loading: false,
      enabled: true,
      source: "remote",
      status: "live_success",
      isStale: false,
      error: null,
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("empty-day:coach_aware:no_data")).toBeTruthy();
    });

    expect(queryByText("coach-card:under_logging")).toBeNull();
  });

  it("uses plain empty state when coach service is unavailable", async () => {
    mockUseMeals.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
    });
    mockUseCoach.mockReturnValue({
      coach: createFallbackCoachResponse("2026-03-18"),
      loading: false,
      enabled: true,
      source: "fallback",
      status: "service_unavailable",
      isStale: true,
      error: new Error("backend down"),
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText, queryByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("empty-day:plain:none")).toBeTruthy();
    });

    expect(queryByText("coach-card:under_logging")).toBeNull();
  });

  it("uses plain empty state when only stale coach cache exists after failure", async () => {
    mockUseMeals.mockReturnValue({
      meals: [],
      getMeals: jest.fn(),
    });
    mockUseCoach.mockReturnValue({
      coach: createCoachResponse({
        topInsight: null,
        insights: [],
        meta: {
          available: true,
          emptyReason: "insufficient_data",
          isDegraded: false,
        },
      }),
      loading: false,
      enabled: true,
      source: "storage",
      status: "stale_cache",
      isStale: true,
      error: new Error("backend down"),
      refresh: jest.fn(),
    });

    const navigation = createNavigation();
    const { getByText } = renderWithTheme(
      <HomeScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("empty-day:plain:none")).toBeTruthy();
    });
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
      expect(mockUseCoach).toHaveBeenCalledWith({
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
      expect(mockUseCoach).toHaveBeenLastCalledWith({
        uid: "user-1",
        dayKey: "2026-03-17",
      });
    });
  });
});
