import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { InputModal } from "@/components/InputModal";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

describe("InputModal", () => {
  it("renders content and propagates text input changes", () => {
    const onChange = jest.fn();
    const { getByText, getByLabelText } = renderWithTheme(
      <InputModal
        visible
        title="Change email"
        message="Enter a new value"
        value=""
        placeholder="Email"
        error="Invalid value"
        onChange={onChange}
      />,
    );

    expect(getByText("Change email")).toBeTruthy();
    expect(getByText("Enter a new value")).toBeTruthy();
    expect(getByText("Invalid value")).toBeTruthy();

    fireEvent.changeText(getByLabelText("Email"), "next@example.com");
    expect(onChange).toHaveBeenCalledWith("next@example.com");
  });

  it("handles primary and secondary actions", () => {
    const onPrimaryAction = jest.fn();
    const onSecondaryAction = jest.fn();
    const { getByText } = renderWithTheme(
      <InputModal
        visible
        value=""
        onChange={() => undefined}
        primaryActionLabel="Save"
        secondaryActionLabel="Cancel"
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />,
    );

    fireEvent.press(getByText("Save"));
    fireEvent.press(getByText("Cancel"));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });

  it("supports secure text input mode", () => {
    const { getByLabelText } = renderWithTheme(
      <InputModal
        visible
        value=""
        onChange={() => undefined}
        placeholder="Password"
        secureTextEntry
      />,
    );

    expect(getByLabelText("Password").props.secureTextEntry).toBe(true);
  });
});
