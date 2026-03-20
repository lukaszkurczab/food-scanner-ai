import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import CoachInsightCard from "@/feature/Home/components/CoachInsightCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { CoachInsight } from "@/services/coach/coachTypes";

const mockTrackCoachCardViewed = jest.fn<() => Promise<void>>();
const mockTrackCoachCardExpanded = jest.fn<() => Promise<void>>();
const mockTrackCoachCardCtaClicked = jest.fn<() => Promise<void>>();

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackCoachCardViewed: () => mockTrackCoachCardViewed(),
  trackCoachCardExpanded: () => mockTrackCoachCardExpanded(),
  trackCoachCardCtaClicked: () => mockTrackCoachCardCtaClicked(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallback?: string | { defaultValue?: string },
    ) => {
      if (typeof fallback === "string") {
        return fallback;
      }
      return fallback?.defaultValue ?? _key;
    },
  }),
}));

function createInsight(overrides?: Partial<CoachInsight>): CoachInsight {
  return {
    id: "2026-03-18:under_logging",
    type: "under_logging",
    priority: 100,
    title: "Logging looks too light to coach well",
    body: "Log your next meal so today is easier to interpret and adjust.",
    actionLabel: "Log next meal",
    actionType: "log_next_meal",
    reasonCodes: ["valid_logging_days_7_low", "missing_nutrition_meals_today"],
    source: "rules",
    validUntil: "2026-03-18T23:59:59Z",
    confidence: 0.92,
    isPositive: false,
    ...overrides,
  };
}

describe("CoachInsightCard", () => {
  beforeEach(() => {
    mockTrackCoachCardViewed.mockResolvedValue(undefined);
    mockTrackCoachCardExpanded.mockResolvedValue(undefined);
    mockTrackCoachCardCtaClicked.mockResolvedValue(undefined);
  });

  it("renders the insight and triggers CTA", () => {
    const onPressCta = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <CoachInsightCard
        insight={createInsight()}
        onPressCta={onPressCta}
        ctaTargetScreen="MealAddMethod"
      />,
    );

    expect(getByText("Coach insight")).toBeTruthy();
    expect(getByText("Logging looks too light to coach well")).toBeTruthy();
    expect(getByText("Log your next meal so today is easier to interpret and adjust.")).toBeTruthy();

    fireEvent.press(getByTestId("coach-insight-cta"));
    expect(onPressCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCoachCardCtaClicked).toHaveBeenCalledTimes(1);
  });

  it("expands the why section with reason copy", () => {
    const { getByText, queryByText } = renderWithTheme(
      <CoachInsightCard insight={createInsight()} />,
    );

    expect(queryByText("This is based on your recent logging")).toBeNull();

    fireEvent.press(getByText("Why am I seeing this?"));

    expect(getByText("This is based on your recent logging")).toBeTruthy();
    expect(getByText(/There have been too few solid logging days recently\./)).toBeTruthy();
    expect(getByText(/At least one meal today is missing useful nutrition detail\./)).toBeTruthy();
    expect(mockTrackCoachCardExpanded).toHaveBeenCalledTimes(1);
  });

  it("hides the CTA when the insight has no action", () => {
    const { queryByTestId, getByText } = renderWithTheme(
      <CoachInsightCard
        insight={createInsight({
          type: "stable",
          actionType: "none",
          actionLabel: null,
        })}
      />,
    );

    expect(getByText("Coach insight")).toBeTruthy();
    expect(queryByTestId("coach-insight-cta")).toBeNull();
  });

  it("tracks card exposure on mount", () => {
    renderWithTheme(
      <CoachInsightCard insight={createInsight()} />,
    );

    expect(mockTrackCoachCardViewed).toHaveBeenCalledTimes(1);
  });
});
