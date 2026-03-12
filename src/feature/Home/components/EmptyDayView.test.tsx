import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import EmptyDayView from "@/feature/Home/components/EmptyDayView";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("EmptyDayView", () => {
  it("renders today state and triggers add meal action", () => {
    const onAddMeal = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <EmptyDayView isToday onAddMeal={onAddMeal} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.subtitle_today")).toBeTruthy();
    expect(getByText("translated:emptyDay.addMeal")).toBeTruthy();
    expect(queryByText("translated:emptyDay.openHistory")).toBeNull();

    fireEvent.press(getByText("translated:emptyDay.addMeal"));
    expect(onAddMeal).toHaveBeenCalledTimes(1);
  });

  it("renders non-today state and triggers open history action", () => {
    const onOpenHistory = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <EmptyDayView isToday={false} onOpenHistory={onOpenHistory} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.openHistory")).toBeTruthy();
    expect(queryByText("translated:emptyDay.addMeal")).toBeNull();

    fireEvent.press(getByText("translated:emptyDay.openHistory"));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it("renders today offline copy", () => {
    const onAddMeal = jest.fn();
    const { getByText } = renderWithTheme(
      <EmptyDayView isToday isOffline onAddMeal={onAddMeal} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.subtitle_offline_today")).toBeTruthy();
    fireEvent.press(getByText("translated:emptyDay.addMeal"));
    expect(onAddMeal).toHaveBeenCalledTimes(1);
  });

  it("renders past day offline copy", () => {
    const onOpenHistory = jest.fn();
    const { getByText } = renderWithTheme(
      <EmptyDayView isToday={false} isOffline onOpenHistory={onOpenHistory} />,
    );

    expect(getByText("translated:emptyDay.title")).toBeTruthy();
    expect(getByText("translated:emptyDay.subtitle_offline_past")).toBeTruthy();
    fireEvent.press(getByText("translated:emptyDay.openHistory"));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});
