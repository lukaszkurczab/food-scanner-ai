import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { DateRangePicker } from "@/components/DateRangePicker";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("DateRangePicker", () => {
  it("renders summary and triggers open action", () => {
    const onOpen = jest.fn();
    const startDate = new Date(2026, 0, 5);
    const endDate = new Date(2026, 0, 10);
    const fmt = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
    });
    const { getByText } = renderWithTheme(
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onOpen={onOpen}
        locale="en-US"
      />,
    );

    expect(getByText("translated:dateRange.label")).toBeTruthy();
    expect(getByText(`${fmt.format(startDate)} - ${fmt.format(endDate)}`)).toBeTruthy();

    fireEvent.press(getByText("translated:dateRange.set"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("applies pressed styles to the picker field", () => {
    const { UNSAFE_root } = renderWithTheme(
      <DateRangePicker
        startDate={new Date(2026, 0, 5)}
        endDate={new Date(2026, 0, 10)}
        onOpen={() => undefined}
      />,
    );

    const pickerField = UNSAFE_root.find(
      (node) =>
        node.props.accessibilityRole === "button" &&
        node.props.accessibilityLabel === "translated:dateRange.set" &&
        typeof node.props.style === "function",
    );
    const pressedStyles = pickerField.props.style({
      pressed: true,
    });

    expect(pressedStyles).toHaveLength(2);
    expect(pressedStyles[1]).toBeTruthy();
  });
});
