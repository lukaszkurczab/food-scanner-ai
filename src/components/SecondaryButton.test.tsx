import { Pressable } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { SecondaryButton } from "@/components/SecondaryButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("SecondaryButton", () => {
  it("renders label and handles press", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <SecondaryButton label="Cancel" onPress={onPress} />,
    );

    fireEvent.press(getByText("Cancel"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onPress while disabled", () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(
      <SecondaryButton label="Cancel" onPress={onPress} disabled />,
    );

    fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not render label while loading", () => {
    const { queryByText } = renderWithTheme(
      <SecondaryButton label="Cancel" onPress={() => undefined} loading />,
    );

    expect(queryByText("Cancel")).toBeNull();
  });

  it("applies pressed and disabled styles correctly", () => {
    const { UNSAFE_getByType, rerender } = renderWithTheme(
      <SecondaryButton label="Cancel" onPress={() => undefined} />,
    );

    const enabledButton = UNSAFE_getByType(Pressable);
    const enabledStyle = enabledButton.props.style({ pressed: true }) as Array<unknown>;
    expect(enabledStyle).toContainEqual(expect.objectContaining({ opacity: 0.84 }));

    rerender(<SecondaryButton label="Cancel" onPress={() => undefined} disabled />);
    const disabledButton = UNSAFE_getByType(Pressable);
    const disabledStyle = disabledButton.props.style({ pressed: true }) as Array<unknown>;
    expect(disabledStyle).toContainEqual(expect.objectContaining({ opacity: 0.6 }));
    expect(disabledButton.props.android_ripple).toBeUndefined();
  });
});
