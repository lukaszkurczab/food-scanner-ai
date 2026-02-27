import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { LinkText } from "@/components/LinkText";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("LinkText", () => {
  it("renders text prop and handles press", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <LinkText text="Privacy policy" onPress={onPress} />,
    );

    fireEvent.press(getByText("Privacy policy"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders children when provided", () => {
    const { queryByText, getByText } = renderWithTheme(
      <LinkText text="Fallback">Open profile</LinkText>,
    );

    expect(getByText("Open profile")).toBeTruthy();
    expect(queryByText("Fallback")).toBeNull();
  });

  it("does not trigger press handler when disabled", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <LinkText text="Privacy policy" onPress={onPress} disabled />,
    );

    fireEvent.press(getByText("Privacy policy"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
