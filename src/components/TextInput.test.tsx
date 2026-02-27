import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { TextInput as AppTextInput } from "@/components/TextInput";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("TextInput", () => {
  it("renders label, right label and error text", () => {
    const { getByText } = renderWithTheme(
      <AppTextInput
        label="Email"
        value=""
        onChangeText={() => undefined}
        rightLabel="@example.com"
        error="Invalid email"
      />,
    );

    expect(getByText("Email")).toBeTruthy();
    expect(getByText("@example.com")).toBeTruthy();
    expect(getByText("Invalid email")).toBeTruthy();
  });

  it("calls onChangeText and focus handlers", () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <AppTextInput
        value=""
        onChangeText={onChangeText}
        placeholder="Type here"
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );

    const input = getByPlaceholderText("Type here");
    fireEvent.changeText(input, "hello");
    fireEvent(input, "focus");
    fireEvent(input, "blur");

    expect(onChangeText).toHaveBeenCalledWith("hello");
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
