import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { ErrorButton } from "@/components/ErrorButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("ErrorButton", () => {
  it("renders label and handles press", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <ErrorButton label="Delete" onPress={onPress} />,
    );

    fireEvent.press(getByText("Delete"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onPress while loading", () => {
    const onPress = jest.fn();
    const { queryByText, getByRole } = renderWithTheme(
      <ErrorButton label="Delete" onPress={onPress} loading />,
    );

    expect(queryByText("Delete")).toBeNull();
    fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
