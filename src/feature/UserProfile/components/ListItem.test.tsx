import { Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { ListItem } from "@/feature/UserProfile/components/ListItem";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

describe("UserProfile ListItem", () => {
  it("renders label, icon and handles press", () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <ListItem
        label="Change email"
        onPress={onPress}
        icon={<Text testID="left-icon">icon</Text>}
        testID="profile-item"
      />,
    );

    expect(getByText("Change email")).toBeTruthy();
    expect(getByTestId("left-icon")).toBeTruthy();

    fireEvent.press(getByTestId("profile-item"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onPress when disabled or loading", () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = renderWithTheme(
      <ListItem label="Change email" onPress={onPress} testID="profile-item" disabled />,
    );

    fireEvent.press(getByTestId("profile-item"));
    expect(onPress).not.toHaveBeenCalled();

    rerender(
      <ListItem label="Change email" onPress={onPress} testID="profile-item" loading />,
    );
    fireEvent.press(getByTestId("profile-item"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
