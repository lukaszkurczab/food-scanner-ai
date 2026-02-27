import type { ReactNode } from "react";
import { Image } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import ZoomModal from "@/components/ZoomModal";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const createGesture = () => {
  const gesture = {
    onBegin: () => gesture,
    onUpdate: () => gesture,
    onEnd: () => gesture,
    numberOfTaps: () => gesture,
    maxDuration: () => gesture,
    enabled: () => gesture,
  };
  return gesture;
};

jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children?: ReactNode }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(View, null, children);
  },
  Gesture: {
    Pinch: () => createGesture(),
    Pan: () => createGesture(),
    Tap: () => createGesture(),
    Simultaneous: () => createGesture(),
    Exclusive: () => createGesture(),
  },
}));

jest.mock("react-native-reanimated", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Image: RNImage } =
    jest.requireActual<typeof import("react-native")>("react-native");

  const AnimatedImage = ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement(RNImage, props, children);

  return {
    __esModule: true,
    default: { Image: AnimatedImage },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    withTiming: (value: number) => value,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
  };
});

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

describe("ZoomModal", () => {
  it("renders image preview and close action when visible", () => {
    const { getByLabelText, UNSAFE_getByType } = renderWithTheme(
      <ZoomModal visible uri="file:///preview.jpg" onClose={() => undefined} />,
    );

    expect(getByLabelText("Zamknij podgląd")).toBeTruthy();
    expect(UNSAFE_getByType(Image).props.source.uri).toBe("file:///preview.jpg");
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <ZoomModal visible uri="file:///preview.jpg" onClose={onClose} />,
    );

    fireEvent.press(getByLabelText("Zamknij podgląd"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render content when modal is hidden", () => {
    const { queryByLabelText } = renderWithTheme(
      <ZoomModal visible={false} uri="file:///preview.jpg" onClose={() => undefined} />,
    );

    expect(queryByLabelText("Zamknij podgląd")).toBeNull();
  });
});
