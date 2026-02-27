import React from "react";
import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { ScreenCornerNavButton } from "@/components/ScreenCornerNavButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockIconButton = jest.fn(
  ({
    onPress,
  }: {
    icon: React.ReactElement<{ name?: string }>;
    onPress: () => void;
    backgroundColor?: string;
    iconColor?: string;
    accessibilityLabel: string;
  }) => (
    <Pressable testID="screen-corner-button" onPress={onPress}>
      <Text>icon-button</Text>
    </Pressable>
  ),
);

jest.mock("./IconButton", () => ({
  IconButton: (props: {
    icon: React.ReactElement<{ name?: string }>;
    onPress: () => void;
    backgroundColor?: string;
    iconColor?: string;
    accessibilityLabel: string;
  }) => mockIconButton(props),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
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

    const props = mockIconButton.mock.calls[0][0] as {
      icon: React.ReactElement<{ name?: string }>;
      accessibilityLabel: string;
      backgroundColor?: string;
      iconColor?: string;
    };

    expect(props.icon.props.name).toBe("arrow-back");
    expect(props.accessibilityLabel).toBe("go-back");
    expect(props.backgroundColor).toBeUndefined();
    expect(props.iconColor).toBeUndefined();

    fireEvent.press(getByTestId("screen-corner-button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses camera tone colors for close icon", () => {
    renderWithTheme(
      <ScreenCornerNavButton
        icon="close"
        tone="camera"
        onPress={() => undefined}
        accessibilityLabel="close-camera"
      />,
    );

    const props = mockIconButton.mock.calls[0][0] as {
      icon: React.ReactElement<{ name?: string }>;
      backgroundColor?: string;
      iconColor?: string;
    };

    expect(props.icon.props.name).toBe("close");
    expect(props.backgroundColor).toBe("rgba(0,0,0,0.45)");
    expect(props.iconColor).toBe("#fff");
  });
});
