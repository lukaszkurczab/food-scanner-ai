import { Pressable } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { PrimaryButton } from "@/components/PrimaryButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { ThemeProvider } from "@/theme/ThemeProvider";

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

  it("applies pressed and disabled styles correctly", () => {
    const { UNSAFE_getByType, rerender } = renderWithTheme(
      <PrimaryButton label="Save" onPress={() => undefined} />,
    );

    const enabledButton = UNSAFE_getByType(Pressable);
    const enabledStyle = enabledButton.props.style({ pressed: true }) as Array<unknown>;
    expect(enabledStyle).toContainEqual(expect.objectContaining({ opacity: 0.84 }));

    rerender(<PrimaryButton label="Save" onPress={() => undefined} disabled />);
    const disabledButton = UNSAFE_getByType(Pressable);
    const disabledStyle = disabledButton.props.style({ pressed: true }) as Array<unknown>;
    expect(disabledStyle).toContainEqual(expect.objectContaining({ opacity: 0.6 }));
    expect(disabledButton.props.android_ripple).toBeUndefined();
  });

  it("renders in dark mode", () => {
    const { getByText } = render(
      <ThemeProvider mode="dark" followSystem={false}>
        <PrimaryButton label="Save" />
      </ThemeProvider>,
    );

    expect(getByText("Save")).toBeTruthy();
  });
});
