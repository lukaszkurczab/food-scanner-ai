import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { LongTextInput } from "@/components/LongTextInput";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { themes } from "@/theme/themes";

describe("LongTextInput", () => {
  it("renders label, counter and error", () => {
    const { getByText } = renderWithTheme(
      <LongTextInput
        label="Notes"
        value="abc"
        onChangeText={() => undefined}
        maxLength={10}
        error="Required"
      />,
    );

    expect(getByText("Notes")).toBeTruthy();
    expect(getByText("3/10")).toBeTruthy();
    expect(getByText("Required")).toBeTruthy();
  });

  it("calls onChangeText and forwards focus events", () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByDisplayValue } = renderWithTheme(
      <LongTextInput
        value="hello"
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );

    const input = getByDisplayValue("hello");
    fireEvent.changeText(input, "hello world");
    fireEvent(input, "focus");
    fireEvent(input, "blur");

    expect(onChangeText).toHaveBeenCalledWith("hello world");
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("highlights the counter when max length is reached", () => {
    const { getByText } = renderWithTheme(
      <LongTextInput
        value="abc"
        onChangeText={() => undefined}
        maxLength={3}
      />,
    );

    expect(StyleSheet.flatten(getByText("3/3").props.style)).toEqual(
      expect.objectContaining({ color: themes.light.error.text }),
    );
  });
});
