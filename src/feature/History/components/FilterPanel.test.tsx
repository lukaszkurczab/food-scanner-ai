import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { FilterPanel } from "@/feature/History/components/FilterPanel";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type Filters = {
  calories?: [number, number];
  protein?: [number, number];
  carbs?: [number, number];
  fat?: [number, number];
  dateRange?: { start: Date; end: Date };
};

type RangeSliderProps = {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  children?: ReactNode;
};

type DateRangePickerProps = {
  onOpen: () => void;
};

type CalendarProps = {
  onChangeRange: (range: { start: Date; end: Date }) => void;
};

const mockUseFilters = jest.fn();
const mockRangeSlider = jest.fn<(props: RangeSliderProps) => null>(() => null);

jest.mock("@/context/HistoryContext", () => ({
  useFilters: () => mockUseFilters(),
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    RangeSlider: (props: RangeSliderProps) => {
      mockRangeSlider(props);
      return createElement(Text, null, `range:${props.label}`);
    },
    PrimaryButton: ({ label, onPress }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    SecondaryButton: ({ label, onPress }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

jest.mock("@/components/DateRangePicker", () => ({
  DateRangePicker: ({ onOpen }: DateRangePickerProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      Pressable,
      { onPress: onOpen, accessibilityRole: "button" },
      createElement(Text, null, "date-range-picker"),
    );
  },
}));

jest.mock("@/components/Calendar", () => ({
  Calendar: ({ onChangeRange }: CalendarProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      Pressable,
      {
        onPress: () =>
          onChangeRange({
            start: new Date(2026, 0, 20),
            end: new Date(2026, 0, 19),
          }),
      },
      createElement(Text, null, "calendar-pick"),
    );
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

describe("FilterPanel", () => {
  let mockApplyFilters: ReturnType<typeof jest.fn<(f: Filters) => void>>;
  let mockClearFilters: ReturnType<typeof jest.fn<() => void>>;

  beforeEach(() => {
    mockRangeSlider.mockClear();
    mockApplyFilters = jest.fn<(f: Filters) => void>();
    mockClearFilters = jest.fn<() => void>();
    mockUseFilters.mockReturnValue({
      filters: null,
      applyFilters: mockApplyFilters,
      clearFilters: mockClearFilters,
    });
  });

  it("shows empty state and clears filters from cancel action", () => {
    const { getByText } = renderWithTheme(<FilterPanel scope="history" />);

    expect(getByText("history:noneSelected")).toBeTruthy();
    fireEvent.press(getByText("history:actions.cancel"));
    expect(mockClearFilters).toHaveBeenCalledTimes(1);
  });

  it("adds calorie filter and applies default range payload", () => {
    const { getByText } = renderWithTheme(<FilterPanel scope="history" />);

    fireEvent.press(getByText("history:addFilter"));
    fireEvent.press(getByText("history:filters.calories"));
    fireEvent.press(getByText("history:actions.done"));

    expect(getByText("range:history:filters.calories")).toBeTruthy();

    fireEvent.press(getByText("history:actions.apply"));
    expect(mockApplyFilters).toHaveBeenCalledWith({
      calories: [0, 3000],
    });
  });

  it("normalizes date range when end date is earlier than start date", () => {
    const { getByText } = renderWithTheme(<FilterPanel scope="history" />);

    fireEvent.press(getByText("history:addFilter"));
    fireEvent.press(getByText("history:filters.date"));
    fireEvent.press(getByText("history:actions.done"));

    fireEvent.press(getByText("date-range-picker"));
    fireEvent.press(getByText("calendar-pick"));
    fireEvent.press(getByText("history:actions.save"));
    fireEvent.press(getByText("history:actions.apply"));

    const payload = mockApplyFilters.mock.calls[0][0];
    const start = payload.dateRange?.start;
    const end = payload.dateRange?.end;

    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(start!.getDate()).toBe(19);
    expect(end!.getDate()).toBe(20);
  });
});
