import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StatisticsCustomRangeControl } from "@/feature/Statistics/components/StatisticsCustomRangeControl";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockCalendarOnChange = jest.fn<(next: { start: Date; end: Date }) => void>();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string) => key,
  }),
}));

jest.mock("@/components", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );

  return {
    __esModule: true,
    Calendar: ({
      onChangeRange,
    }: {
      onChangeRange: (range: { start: Date; end: Date }) => void;
    }) =>
      createElement(
        Pressable,
        {
          onPress: () => {
            const next = {
              start: new Date("2026-03-05T00:00:00.000Z"),
              end: new Date("2026-03-01T00:00:00.000Z"),
            };
            mockCalendarOnChange(next);
            onChangeRange(next);
          },
        },
        createElement(Text, null, "calendar-change"),
      ),
    Modal: ({
      visible,
      children,
      primaryAction,
      secondaryAction,
    }: {
      visible: boolean;
      children?: ReactNode;
      primaryAction?: { label: string; onPress?: () => void };
      secondaryAction?: { label: string; onPress?: () => void };
    }) =>
      visible
        ? createElement(
            View,
            null,
            children,
            createElement(
              Pressable,
              { onPress: secondaryAction?.onPress },
              createElement(Text, null, secondaryAction?.label ?? "secondary"),
            ),
            createElement(
              Pressable,
              { onPress: primaryAction?.onPress },
              createElement(Text, null, primaryAction?.label ?? "primary"),
            ),
          )
        : null,
  };
});

describe("StatisticsCustomRangeControl", () => {
  it("cancels without applying", () => {
    const onApply = jest.fn();

    const { getByTestId, getByText } = renderWithTheme(
      <StatisticsCustomRangeControl
        range={{
          start: new Date("2026-03-01T00:00:00.000Z"),
          end: new Date("2026-03-07T00:00:00.000Z"),
        }}
        onApply={onApply}
      />,
    );

    fireEvent.press(getByTestId("statistics-custom-range-trigger"));
    fireEvent.press(getByText("common:cancel"));

    expect(onApply).not.toHaveBeenCalled();
  });

  it("applies normalized range", () => {
    const onApply = jest.fn();

    const { getByTestId, getByText } = renderWithTheme(
      <StatisticsCustomRangeControl
        range={{
          start: new Date("2026-03-01T00:00:00.000Z"),
          end: new Date("2026-03-07T00:00:00.000Z"),
        }}
        onApply={onApply}
      />,
    );

    fireEvent.press(getByTestId("statistics-custom-range-trigger"));
    fireEvent.press(getByText("calendar-change"));
    fireEvent.press(getByText("common:apply"));

    expect(mockCalendarOnChange).toHaveBeenCalled();
    expect(onApply).toHaveBeenCalledWith({
      start: new Date(2026, 2, 1, 0, 0, 0, 0),
      end: new Date(2026, 2, 5, 0, 0, 0, 0),
    });
  });
});
