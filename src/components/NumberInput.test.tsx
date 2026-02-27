import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { NumberInput } from "@/components/NumberInput";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("NumberInput", () => {
  it("sanitizes value on text change", () => {
    const onChangeText = jest.fn();
    const { getByTestId } = renderWithTheme(
      <NumberInput
        variant="native"
        testID="number-input"
        value=""
        onChangeText={onChangeText}
        maxDecimals={1}
      />,
    );

    fireEvent.changeText(getByTestId("number-input"), "01,23abc");
    expect(onChangeText).toHaveBeenCalledWith("1.2");
  });

  it("normalizes trailing decimal separator on blur", () => {
    const onChangeText = jest.fn();
    const onBlur = jest.fn();
    const { getByTestId } = renderWithTheme(
      <NumberInput
        variant="native"
        testID="number-input"
        value="12."
        onChangeText={onChangeText}
        onBlur={onBlur}
      />,
    );

    fireEvent(getByTestId("number-input"), "blur");

    expect(onChangeText).toHaveBeenCalledWith("12");
    expect(onBlur).toHaveBeenCalledWith("12");
  });

  it("uses decimal keyboard by default when decimals are enabled", () => {
    const { getByTestId } = renderWithTheme(
      <NumberInput
        variant="native"
        testID="number-input"
        value=""
        onChangeText={() => undefined}
        maxDecimals={2}
      />,
    );

    expect(getByTestId("number-input").props.keyboardType).toBe("decimal-pad");
  });
});
