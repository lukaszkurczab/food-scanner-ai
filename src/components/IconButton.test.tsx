import React from "react";
import { Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { IconButton } from "@/components/IconButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type FakeIconProps = {
  size?: number;
  color?: string;
};

const FakeIcon: React.FC<FakeIconProps> = ({ size, color }) => (
  <Text testID="fake-icon">{`${String(size)}:${String(color)}`}</Text>
);

describe("IconButton", () => {
  it("handles press events", () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <IconButton testID="icon-button" icon={<FakeIcon />} onPress={onPress} />,
    );

    fireEvent.press(getByTestId("icon-button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("passes computed icon props when icon does not define size/color", () => {
    const { getByTestId } = renderWithTheme(
      <IconButton
        testID="icon-button"
        icon={<FakeIcon />}
        onPress={() => undefined}
        size={50}
        iconColor="rgb(1, 2, 3)"
      />,
    );

    expect(getByTestId("fake-icon").props.children).toBe("40:rgb(1, 2, 3)");
  });

  it("keeps explicit icon size/color and blocks press while disabled", () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <IconButton
        testID="icon-button"
        icon={<FakeIcon size={11} color="orange" />}
        onPress={onPress}
        disabled
      />,
    );

    expect(getByTestId("fake-icon").props.children).toBe("11:orange");
    fireEvent.press(getByTestId("icon-button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
