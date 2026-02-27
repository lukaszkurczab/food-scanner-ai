import { createElement } from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { DateInput } from "@/components/DateInput";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockCreateElement = createElement;
const mockPressable = Pressable;
const mockText = Text;
const mockView = View;

const mockCalendar = jest.fn(
  ({
    onChangeRange,
    onToggleFocus,
  }: {
    onChangeRange: (r: { start: Date; end: Date }) => void;
    onToggleFocus?: () => void;
  }) => {
    return mockCreateElement(
      mockView,
      null,
      mockCreateElement(
        mockPressable,
        {
          onPress: () =>
            onChangeRange({
              start: new Date(2026, 0, 20),
              end: new Date(2026, 0, 19),
            }),
        },
        mockCreateElement(mockText, null, "pick-range"),
      ),
      mockCreateElement(
        mockPressable,
        { onPress: onToggleFocus },
        mockCreateElement(mockText, null, "toggle-focus"),
      ),
    );
  },
);

jest.mock("./Calendar", () => ({
  Calendar: (props: {
    onChangeRange: (r: { start: Date; end: Date }) => void;
    onToggleFocus?: () => void;
  }) => mockCalendar(props),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));

describe("DateInput", () => {
  it("normalizes range to at least one day when allowSingleDay is false", () => {
    const onChange = jest.fn();
    const range = { start: new Date(2026, 0, 10), end: new Date(2026, 0, 12) };
    const { getByText } = renderWithTheme(
      <DateInput range={range} onChange={onChange} />,
    );

    const fmt = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    fireEvent.press(getByText(fmt.format(range.start)));
    fireEvent.press(getByText("pick-range"));
    fireEvent.press(getByText("common:confirm"));

    const next = onChange.mock.calls[0][0] as { start: Date; end: Date };
    expect(next.start.getFullYear()).toBe(2026);
    expect(next.start.getMonth()).toBe(0);
    expect(next.start.getDate()).toBe(20);
    expect(next.end.getDate()).toBe(21);
  });

  it("allows single-day range when allowSingleDay is true", () => {
    const onChange = jest.fn();
    const range = { start: new Date(2026, 0, 10), end: new Date(2026, 0, 12) };
    const { getByText } = renderWithTheme(
      <DateInput range={range} onChange={onChange} allowSingleDay />,
    );

    const fmt = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    fireEvent.press(getByText(fmt.format(range.end)));
    fireEvent.press(getByText("pick-range"));
    fireEvent.press(getByText("common:confirm"));

    const next = onChange.mock.calls[0][0] as { start: Date; end: Date };
    expect(next.start.getDate()).toBe(20);
    expect(next.end.getDate()).toBe(20);
  });

  it("cancels picker without calling onChange", () => {
    const onChange = jest.fn();
    const range = { start: new Date(2026, 0, 10), end: new Date(2026, 0, 12) };
    const { getByText } = renderWithTheme(
      <DateInput range={range} onChange={onChange} />,
    );

    const fmt = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    fireEvent.press(getByText(fmt.format(range.start)));
    fireEvent.press(getByText("common:cancel"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
