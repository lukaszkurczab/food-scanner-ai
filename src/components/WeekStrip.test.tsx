import { createElement } from "react";
import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import WeekStrip from "@/components/WeekStrip";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockCreateElement = createElement;
const mockPressable = Pressable;
const mockText = Text;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("@/components", () => ({
  IconButton: ({
    accessibilityLabel,
    onPress,
  }: {
    accessibilityLabel?: string;
    onPress: () => void;
  }) =>
    mockCreateElement(
      mockPressable,
      { onPress, accessibilityRole: "button", accessibilityLabel },
      mockCreateElement(mockText, null, accessibilityLabel ?? "icon-button"),
    ),
}));

describe("WeekStrip", () => {
  it("selects day and opens history", () => {
    const onSelect = jest.fn();
    const onOpenHistory = jest.fn();
    const days = [
      { date: new Date(2026, 0, 1), label: "M", isToday: false },
      { date: new Date(2026, 0, 2), label: "T", isToday: false },
      { date: new Date(2026, 0, 3), label: "W", isToday: true },
    ];

    const { getByText, getByLabelText } = renderWithTheme(
      <WeekStrip
        days={days}
        selectedDate={days[0].date}
        onSelect={onSelect}
        onOpenHistory={onOpenHistory}
      />,
    );

    fireEvent.press(getByText("W"));
    expect(onSelect).toHaveBeenCalledWith(days[2].date);

    fireEvent.press(getByLabelText("translated:weekStrip.open_history"));
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});
