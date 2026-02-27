import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Clock24h } from "@/components/Clock24h";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const makeLocalDate = (hour: number, minute: number) => {
  const d = new Date(2026, 1, 26, hour, minute, 0, 0);
  return d;
};

describe("Clock24h", () => {
  it("updates hour on commit", () => {
    const onChange = jest.fn();
    const value = makeLocalDate(10, 15);
    const { getByDisplayValue } = renderWithTheme(
      <Clock24h value={value} onChange={onChange} />,
    );

    fireEvent.changeText(getByDisplayValue("10"), "23");
    fireEvent(getByDisplayValue("23"), "blur");

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(23);
    expect(next.getMinutes()).toBe(15);
  });

  it("updates minute on commit", () => {
    const onChange = jest.fn();
    const value = makeLocalDate(10, 15);
    const { getByDisplayValue } = renderWithTheme(
      <Clock24h value={value} onChange={onChange} />,
    );

    fireEvent.changeText(getByDisplayValue("15"), "59");
    fireEvent(getByDisplayValue("59"), "blur");

    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(10);
    expect(next.getMinutes()).toBe(59);
  });
});
