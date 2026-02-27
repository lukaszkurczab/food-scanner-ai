import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Modal } from "@/components/Modal";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

describe("Modal", () => {
  it("renders title/message and handles action presses", () => {
    const onPrimaryAction = jest.fn();
    const onSecondaryAction = jest.fn();
    const { getByText } = renderWithTheme(
      <Modal
        visible
        title="Sync error"
        message="Try again"
        primaryActionLabel="Retry"
        secondaryActionLabel="Cancel"
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />,
    );

    expect(getByText("Sync error")).toBeTruthy();
    expect(getByText("Try again")).toBeTruthy();

    fireEvent.press(getByText("Retry"));
    fireEvent.press(getByText("Cancel"));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });

  it("calls onClose from close button", () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <Modal
        visible
        title="Closable"
        onClose={onClose}
      />,
    );

    fireEvent.press(getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
