import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { WeekdaySelector } from "@/components/WeekdaySelector";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("WeekdaySelector", () => {
  it("adds Monday when it is not selected, while keeping the stored weekday indices intact", () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <WeekdaySelector value={[0]} onChange={onChange} />,
    );

    fireEvent.press(getByTestId("weekday-chip-1"));
    expect(onChange).toHaveBeenCalledWith([0, 1]);
  });

  it("removes Monday when it is selected", () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(
      <WeekdaySelector value={[0, 1]} onChange={onChange} />,
    );

    fireEvent.press(getByTestId("weekday-chip-1"));
    expect(onChange).toHaveBeenCalledWith([0]);
  });
});
