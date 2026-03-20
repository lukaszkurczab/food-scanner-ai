import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import EmptyDayView from "@/feature/Home/components/EmptyDayView";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockTrackCoachEmptyStateViewed = jest.fn<() => Promise<void>>();

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackCoachEmptyStateViewed: () => mockTrackCoachEmptyStateViewed(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("EmptyDayView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackCoachEmptyStateViewed.mockResolvedValue(undefined);
  });

  it("renders plain today state and triggers add meal action without coach telemetry", () => {
    const onAddMeal = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <EmptyDayView isToday onAddMeal={onAddMeal} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.subtitle_today")).toBeTruthy();
    expect(queryByText("translated:emptyDay.coachTitle")).toBeNull();
    expect(queryByText("translated:emptyDay.coachHint_today")).toBeNull();
    expect(getByText("translated:emptyDay.addMeal")).toBeTruthy();
    expect(queryByText("translated:emptyDay.openHistory")).toBeNull();

    fireEvent.press(getByText("translated:emptyDay.addMeal"));
    expect(onAddMeal).toHaveBeenCalledTimes(1);
    expect(mockTrackCoachEmptyStateViewed).not.toHaveBeenCalled();
  });

  it("renders plain non-today state and triggers open history action", () => {
    const onOpenHistory = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <EmptyDayView isToday={false} onOpenHistory={onOpenHistory} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(queryByText("translated:emptyDay.coachHint_past")).toBeNull();
    expect(getByText("translated:emptyDay.openHistory")).toBeTruthy();
    expect(queryByText("translated:emptyDay.addMeal")).toBeNull();

    fireEvent.press(getByText("translated:emptyDay.openHistory"));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
    expect(mockTrackCoachEmptyStateViewed).not.toHaveBeenCalled();
  });

  it("renders today offline copy", () => {
    const onAddMeal = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <EmptyDayView isToday isOffline onAddMeal={onAddMeal} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.subtitle_offline_today")).toBeTruthy();
    expect(queryByText("translated:emptyDay.coachTitle")).toBeNull();
    fireEvent.press(getByText("translated:emptyDay.addMeal"));
    expect(onAddMeal).toHaveBeenCalledTimes(1);
  });

  it("renders past day offline copy", () => {
    const onOpenHistory = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <EmptyDayView isToday={false} isOffline onOpenHistory={onOpenHistory} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.subtitle_offline_past")).toBeTruthy();
    expect(queryByText("translated:emptyDay.coachTitle")).toBeNull();
    fireEvent.press(getByText("translated:emptyDay.openHistory"));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it("renders coach-aware empty state and emits telemetry when live coach empty reason is present", () => {
    const { getByText } = renderWithTheme(
      <EmptyDayView
        mode="coach_aware"
        isToday
        coachEmptyReason="insufficient_data"
        onAddMeal={() => undefined}
      />,
    );

    expect(getByText("translated:emptyDay.coachHint_insufficient_today")).toBeTruthy();
    expect(mockTrackCoachEmptyStateViewed).toHaveBeenCalledTimes(1);
  });

  it("keeps service-unavailable style plain empty state free from coach telemetry", () => {
    renderWithTheme(
      <EmptyDayView isToday onAddMeal={() => undefined} />,
    );

    expect(mockTrackCoachEmptyStateViewed).not.toHaveBeenCalled();
  });

  it("keeps stale-cache style plain empty state free from coach telemetry", () => {
    renderWithTheme(
      <EmptyDayView isToday={false} onOpenHistory={() => undefined} />,
    );

    expect(mockTrackCoachEmptyStateViewed).not.toHaveBeenCalled();
  });
});
