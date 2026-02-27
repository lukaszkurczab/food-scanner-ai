import type { ReactNode } from "react";
import { Image } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import PhotoPreview from "@/components/PhotoPreview";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const createGesture = () => {
  const gesture = {
    enabled: () => gesture,
    onBegin: () => gesture,
    onUpdate: () => gesture,
    onEnd: () => gesture,
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
    Pan: () => createGesture(),
    Pinch: () => createGesture(),
    Simultaneous: () => createGesture(),
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
  };
});

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("@/components/ZoomModal", () => ({
  __esModule: true,
  default: ({ visible }: { visible: boolean }) => (visible ? "zoom-open" : null),
}));

describe("PhotoPreview", () => {
  let getSizeSpy: jest.SpiedFunction<typeof Image.getSize>;

  beforeEach(() => {
    getSizeSpy = jest
      .spyOn(Image, "getSize")
      .mockImplementation((_uri, success) => success(1200, 800));
  });

  afterEach(() => {
    getSizeSpy.mockRestore();
  });

  it("triggers retake and accept actions", () => {
    const onRetake = jest.fn();
    const onAccept = jest.fn();
    const { getByText } = renderWithTheme(
      <PhotoPreview
        photoUri="file:///meal-1.jpg"
        onRetake={onRetake}
        onAccept={onAccept}
        primaryText="use-photo"
        secondaryText="retake"
      />,
    );

    fireEvent.press(getByText("retake"));
    fireEvent.press(getByText("use-photo"));

    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(onAccept).toHaveBeenCalledWith("file:///meal-1.jpg");
  });

  it("accepts updated uri after prop change", () => {
    const onAccept = jest.fn();
    const { getByText, rerender } = renderWithTheme(
      <PhotoPreview
        photoUri="file:///initial.jpg"
        onRetake={() => undefined}
        onAccept={onAccept}
        primaryText="confirm"
        secondaryText="cancel"
      />,
    );

    rerender(
      <PhotoPreview
        photoUri="file:///updated.jpg"
        onRetake={() => undefined}
        onAccept={onAccept}
        primaryText="confirm"
        secondaryText="cancel"
      />,
    );

    fireEvent.press(getByText("confirm"));
    expect(onAccept).toHaveBeenCalledWith("file:///updated.jpg");
  });
});
