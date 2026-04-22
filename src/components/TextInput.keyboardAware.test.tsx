import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { TextInput } from "@/components/TextInput";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockFocusIntoView = jest.fn();

jest.mock("@/components/KeyboardAwareScrollView", () => ({
  __esModule: true,
  useKeyboardAwareInputFocus: () => mockFocusIntoView,
}));

describe("TextInput keyboard awareness", () => {
  it("requests scroll-to-focused-input when focus is received", () => {
    const { getByTestId } = renderWithTheme(
      <TextInput
        testID="text-input"
        label="Name"
        value=""
        onChangeText={() => {}}
      />,
    );

    fireEvent(getByTestId("text-input"), "focus");

    expect(mockFocusIntoView).toHaveBeenCalledTimes(1);
    expect(mockFocusIntoView).toHaveBeenCalledWith(expect.any(Object));
  });
});
