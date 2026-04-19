import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Slider } from "@/components/Slider";
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

describe("Slider", () => {
  it("updates value from track press", () => {
    const onValueChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Slider
        value={20}
        minimumValue={0}
        maximumValue={100}
        step={10}
        onValueChange={onValueChange}
      />,
    );

    const track = getByRole("button");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 100 } } });
    fireEvent.press(track, { nativeEvent: { locationX: 25 } });

    expect(onValueChange).toHaveBeenCalledWith(30);
  });

  it("does not emit updates when disabled", () => {
    const onValueChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Slider
        value={20}
        minimumValue={0}
        maximumValue={100}
        onValueChange={onValueChange}
        disabled
      />,
    );

    const track = getByRole("button");
    fireEvent(track, "layout", { nativeEvent: { layout: { width: 100 } } });
    fireEvent.press(track, { nativeEvent: { locationX: 60 } });

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
