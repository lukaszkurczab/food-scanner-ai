import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { PrimaryButton } from "@/components/PrimaryButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("PrimaryButton", () => {
  it("renders label and handles press", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <PrimaryButton label="Save" onPress={onPress} />,
    );

    fireEvent.press(getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("prefers children over label", () => {
    const { queryByText, getByText } = renderWithTheme(
      <PrimaryButton label="Save">Send</PrimaryButton>,
    );

    expect(getByText("Send")).toBeTruthy();
    expect(queryByText("Save")).toBeNull();
  });

  it("does not trigger onPress while loading", () => {
    const onPress = jest.fn();
    const { queryByText, getByRole } = renderWithTheme(
      <PrimaryButton label="Save" onPress={onPress} loading />,
    );

    expect(queryByText("Save")).toBeNull();
    fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
