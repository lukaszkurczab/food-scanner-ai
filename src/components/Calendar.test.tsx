import { Pressable } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Calendar } from "@/components/Calendar";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en-US" },
  }),
}));

const START = new Date(2026, 0, 10);
const END = new Date(2026, 0, 10);

describe("Calendar", () => {
  it("calls range handlers in range mode", () => {
    const onChangeRange = jest.fn();
    const onToggleFocus = jest.fn();
    const { UNSAFE_getAllByType } = renderWithTheme(
      <Calendar
        startDate={START}
        endDate={END}
        focus="start"
        onChangeRange={onChangeRange}
        onToggleFocus={onToggleFocus}
      />,
    );

    const pressables = UNSAFE_getAllByType(Pressable);
    const cells = pressables.slice(2);
    const firstEnabled = cells.find((node) => !node.props.disabled);
    if (!firstEnabled) throw new Error("Expected at least one enabled day cell");

    fireEvent.press(firstEnabled);

    expect(onChangeRange).toHaveBeenCalledTimes(1);
    expect(onToggleFocus).toHaveBeenCalledTimes(1);
    expect(onChangeRange).toHaveBeenCalledWith({
      start: expect.any(Date),
      end: expect.any(Date),
    });
  });

  it("calls single picker callback in single mode", () => {
    const onPickSingle = jest.fn();
    const onChangeRange = jest.fn();
    const { UNSAFE_getAllByType } = renderWithTheme(
      <Calendar
        startDate={START}
        endDate={END}
        focus="start"
        onChangeRange={onChangeRange}
        mode="single"
        onPickSingle={onPickSingle}
      />,
    );

    const pressables = UNSAFE_getAllByType(Pressable);
    const cells = pressables.slice(2);
    const firstEnabled = cells.find((node) => !node.props.disabled);
    if (!firstEnabled) throw new Error("Expected at least one enabled day cell");

    fireEvent.press(firstEnabled);

    expect(onPickSingle).toHaveBeenCalledTimes(1);
    expect(onPickSingle).toHaveBeenCalledWith(expect.any(Date));
    expect(onChangeRange).not.toHaveBeenCalled();
  });

  it("does not emit range updates when all visible days are disabled", () => {
    const onChangeRange = jest.fn();
    const { UNSAFE_getAllByType } = renderWithTheme(
      <Calendar
        startDate={START}
        endDate={END}
        focus="start"
        onChangeRange={onChangeRange}
        minDate={new Date(2099, 0, 1)}
        maxDate={new Date(2099, 11, 31)}
      />,
    );

    const pressables = UNSAFE_getAllByType(Pressable);
    const cells = pressables.slice(2);
    fireEvent.press(cells[0]);

    expect(onChangeRange).not.toHaveBeenCalled();
  });
});
