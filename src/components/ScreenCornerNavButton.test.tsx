import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { ScreenCornerNavButton } from "@/components/ScreenCornerNavButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

describe("ScreenCornerNavButton", () => {
  it("maps back icon and forwards press handler", () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <ScreenCornerNavButton
        icon="back"
        onPress={onPress}
        accessibilityLabel="go-back"
      />,
    );

    fireEvent.press(getByTestId("screen-corner-button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders the close variant as a pressable shell button", () => {
    const { getByTestId } = renderWithTheme(
      <ScreenCornerNavButton
        icon="close"
        onPress={() => undefined}
        accessibilityLabel="close-camera"
      />,
    );

    expect(getByTestId("screen-corner-button")).toBeTruthy();
  });

  it("exposes disabled accessibility state and pressed styles", () => {
    const { UNSAFE_root, getByTestId } = renderWithTheme(
      <ScreenCornerNavButton
        icon="close"
        onPress={() => undefined}
        accessibilityLabel="close-camera"
        disabled
      />,
    );

    const button = getByTestId("screen-corner-button");
    const buttonPressable = UNSAFE_root.find(
      (node) =>
        node.props.accessibilityRole === "button" &&
        node.props.accessibilityLabel === "close-camera" &&
        typeof node.props.style === "function",
    );
    const pressedStyles = buttonPressable.props.style({
      pressed: true,
    });

    expect(button.props.accessibilityState).toEqual({ disabled: true });
    expect(pressedStyles).toHaveLength(3);
    expect(pressedStyles[1]).toBeTruthy();
  });
});
