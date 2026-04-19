import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { RangeSlider } from "@/components/RangeSlider";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-native-gesture-handler", () => ({
  Gesture: {
    Pan: () => {
      const chain = {
        enabled: () => chain,
        onBegin: () => chain,
        onUpdate: () => chain,
      };
      return chain;
    },
  },
  GestureDetector: ({ children }: { children?: ReactNode }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(View, null, children);
  },
}));

jest.mock("react-native-reanimated", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  const AnimatedView = ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement(View, props, children);

  return {
    __esModule: true,
    default: { View: AnimatedView },
    View: AnimatedView,
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    withTiming: (value: number) => value,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    useAnimatedGestureHandler: () => () => undefined,
  };
});

describe("RangeSlider", () => {
  it("renders labels and updates nearest bound on track press", () => {
    const onChange = jest.fn();
    const { getByRole, getByText } = renderWithTheme(
      <RangeSlider
        label="macro-range"
        min={0}
        max={100}
        step={10}
        value={[20, 80]}
        onChange={onChange}
      />,
    );

    expect(getByText("macro-range")).toBeTruthy();
    expect(getByText("20–80")).toBeTruthy();
    expect(getByText("0")).toBeTruthy();
    expect(getByText("100")).toBeTruthy();

    const track = getByRole("button");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 100 } } });
    fireEvent.press(track, { nativeEvent: { locationX: 25 } });

    expect(onChange).toHaveBeenCalledWith([30, 80]);
  });

  it("does not emit changes when disabled", () => {
    const onChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <RangeSlider
        min={0}
        max={100}
        value={[20, 80]}
        onChange={onChange}
        disabled
      />,
    );

    const track = getByRole("button");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 100 } } });
    fireEvent.press(track, { nativeEvent: { locationX: 60 } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
