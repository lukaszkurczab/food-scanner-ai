import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { DateTimeSection } from "@/components/DateTimeSection";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type ClockProps = {
  value: Date;
  onChange: (d: Date) => void;
};

type CalendarProps = {
  onPickSingle?: (d: Date) => void;
  onChangeRange?: (range: { start: Date; end?: Date }) => void;
  onToggleFocus?: () => void;
};

type CardProps = {
  children: ReactNode;
};

type ModalProps = {
  visible: boolean;
  children: ReactNode;
  primaryAction?: { label: string; onPress?: () => void };
  secondaryAction?: { label: string; onPress?: () => void };
};

const mockCalendarDate = new Date(2026, 0, 5, 8, 30);
const mockRangeDate = new Date(2026, 0, 6, 7, 15);

const mockClock24h = jest.fn(({ onChange }: ClockProps) => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Pressable: RNPressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return createElement(
    RNPressable,
    { onPress: () => onChange(new Date(2026, 0, 4, 9, 45)) },
    createElement(Text, null, "clock-24h"),
  );
});

const mockClock12h = jest.fn(({ onChange }: ClockProps) => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Pressable: RNPressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return createElement(
    RNPressable,
    { onPress: () => onChange(new Date(2026, 0, 4, 21, 45)) },
    createElement(Text, null, "clock-12h"),
  );
});

const mockCalendar = jest.fn(
  ({ onPickSingle, onChangeRange, onToggleFocus }: CalendarProps) => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Pressable: RNPressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return createElement(
    View,
    null,
    createElement(
      RNPressable,
      { onPress: () => onPickSingle?.(mockCalendarDate) },
      createElement(Text, null, "calendar-pick"),
    ),
    createElement(
      RNPressable,
      { onPress: () => onChangeRange?.({ start: mockRangeDate }) },
      createElement(Text, null, "calendar-range"),
    ),
    createElement(
      RNPressable,
      { onPress: () => onToggleFocus?.() },
      createElement(Text, null, "calendar-toggle"),
    ),
  );
});

let mockLanguage: string | undefined = "pl-PL";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: mockLanguage },
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { Pressable: RNPressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Card: ({ children }: CardProps) => createElement(View, null, children),
    Modal: ({
      visible,
      children,
      primaryAction,
      secondaryAction,
    }: ModalProps) => {
      if (!visible) return null;
      return createElement(
        View,
        null,
        children,
        primaryAction
          ? createElement(
              RNPressable,
              { onPress: primaryAction.onPress },
              createElement(Text, null, primaryAction.label),
            )
          : null,
        secondaryAction
          ? createElement(
              RNPressable,
              { onPress: secondaryAction.onPress },
              createElement(Text, null, secondaryAction.label),
            )
          : null,
      );
    },
    Clock24h: (props: ClockProps) => mockClock24h(props),
    Clock12h: (props: ClockProps) => mockClock12h(props),
    Calendar: (props: CalendarProps) => mockCalendar(props),
  };
});

describe("DateTimeSection", () => {
  afterEach(() => {
    mockLanguage = "pl-PL";
    jest.restoreAllMocks();
  });

  it("saves selected date from calendar picker", () => {
    const onChange = jest.fn();
    const { getByText, UNSAFE_getAllByType } = renderWithTheme(
      <DateTimeSection
        value={new Date(2026, 0, 2, 10, 30)}
        onChange={onChange}
      />,
    );

    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    fireEvent.press(getByText("calendar-pick"));
    fireEvent.press(getByText("Save"));

    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(5);
  });

  it("cancels editing without emitting onChange", () => {
    const onChange = jest.fn();
    const { getByText, UNSAFE_getAllByType } = renderWithTheme(
      <DateTimeSection
        value={new Date(2026, 0, 2, 10, 30)}
        onChange={onChange}
      />,
    );

    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    fireEvent.press(getByText("Cancel"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses fallback locale and 12h clock when dayPeriod is available", () => {
    mockLanguage = undefined;
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "formatToParts")
      .mockReturnValue([
        { type: "hour", value: "1" },
        { type: "dayPeriod", value: "PM" },
      ] as Intl.DateTimeFormatPart[]);

    const onChange = jest.fn();
    const { getByText, UNSAFE_getAllByType } = renderWithTheme(
      <DateTimeSection
        value={new Date(2026, 0, 2, 10, 30)}
        onChange={onChange}
      />,
    );

    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    fireEvent.press(getByText("clock-12h"));
    fireEvent.press(getByText("Save"));

    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getHours()).toBe(21);
    expect(next.getMinutes()).toBe(45);
  });

  it("falls back to 24h and saves range start when formatToParts throws", () => {
    jest
      .spyOn(Intl.DateTimeFormat.prototype, "formatToParts")
      .mockImplementation(() => {
        throw new Error("formatToParts failed");
      });

    const onChange = jest.fn();
    const { getByText, UNSAFE_getAllByType } = renderWithTheme(
      <DateTimeSection
        value={new Date(2026, 0, 2, 10, 30)}
        onChange={onChange}
      />,
    );

    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    fireEvent.press(getByText("calendar-range"));
    fireEvent.press(getByText("calendar-toggle"));
    fireEvent.press(getByText("Save"));

    const next = onChange.mock.calls[0][0] as Date;
    expect(next.getDate()).toBe(6);
    expect(next.getHours()).toBe(10);
    expect(next.getMinutes()).toBe(30);
  });
});
