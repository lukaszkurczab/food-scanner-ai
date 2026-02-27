import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { WeekdaySelector } from "@/components/WeekdaySelector";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("WeekdaySelector", () => {
  it("adds weekday when it is not selected", () => {
    const onChange = jest.fn();
    const { getByText } = renderWithTheme(
      <WeekdaySelector value={[0]} onChange={onChange} />,
    );

    fireEvent.press(getByText("M"));
    expect(onChange).toHaveBeenCalledWith([0, 1]);
  });

  it("removes weekday when it is selected", () => {
    const onChange = jest.fn();
    const { getByText } = renderWithTheme(
      <WeekdaySelector value={[0, 1]} onChange={onChange} />,
    );

    fireEvent.press(getByText("M"));
    expect(onChange).toHaveBeenCalledWith([0]);
  });
});
