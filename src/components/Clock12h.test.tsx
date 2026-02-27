import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Clock12h } from "@/components/Clock12h";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const makeLocalDate = (hour: number, minute: number) => {
  const d = new Date(2026, 1, 26, hour, minute, 0, 0);
  return d;
};

describe("Clock12h", () => {
  it("toggles to PM and updates hour", () => {
    const onChange = jest.fn();
    const value = makeLocalDate(9, 20);
    const { getByText } = renderWithTheme(
      <Clock12h value={value} onChange={onChange} />,
    );

    fireEvent.press(getByText("PM"));
    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(21);
    expect(next.getMinutes()).toBe(20);
  });

  it("commits hour input with zero mapped to 12", () => {
    const onChange = jest.fn();
    const value = makeLocalDate(9, 20);
    const { getByDisplayValue } = renderWithTheme(
      <Clock12h value={value} onChange={onChange} />,
    );

    fireEvent.changeText(getByDisplayValue("09"), "00");
    fireEvent(getByDisplayValue("00"), "blur");

    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(20);
  });
});
