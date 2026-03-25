import { Pressable } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { InputBar } from "@/feature/AI/components/InputBar";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("InputBar", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends trimmed message and clears input", () => {
    const onSend = jest.fn();
    const { getByTestId } = renderWithTheme(<InputBar onSend={onSend} />);

    fireEvent.changeText(getByTestId("chat-input"), "   hello world   ");
    fireEvent.press(getByTestId("chat-send-button"));

    expect(onSend).toHaveBeenCalledWith("hello world");
    expect(getByTestId("chat-input").props.value).toBe("");
  });

  it("does not send empty or disabled input", () => {
    const onSend = jest.fn();
    const { getByTestId, rerender } = renderWithTheme(<InputBar onSend={onSend} />);

    fireEvent.changeText(getByTestId("chat-input"), "   ");
    fireEvent.press(getByTestId("chat-send-button"));
    expect(onSend).not.toHaveBeenCalled();

    rerender(<InputBar onSend={onSend} disabled />);
    fireEvent.changeText(getByTestId("chat-input"), "hello");
    fireEvent.press(getByTestId("chat-send-button"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("renders helper text and translated controls", () => {
    const { getByText, getByPlaceholderText } = renderWithTheme(
      <InputBar onSend={() => undefined} helperText="Helper info" />,
    );

    expect(getByPlaceholderText("translated:input.placeholder")).toBeTruthy();
    expect(getByText("translated:input.send")).toBeTruthy();
    expect(getByText("Helper info")).toBeTruthy();
  });

  it("uses custom placeholder", () => {
    const { getByPlaceholderText } = renderWithTheme(
      <InputBar onSend={() => undefined} placeholder="Custom placeholder" />,
    );

    expect(getByPlaceholderText("Custom placeholder")).toBeTruthy();
  });

  it("renders and triggers helper action", () => {
    const onHelperActionPress = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <InputBar
        onSend={() => undefined}
        helperText="Retry failed request"
        helperActionLabel="Retry"
        onHelperActionPress={onHelperActionPress}
      />,
    );

    expect(getByText("Retry failed request")).toBeTruthy();
    fireEvent.press(getByTestId("chat-helper-action"));

    expect(onHelperActionPress).toHaveBeenCalledTimes(1);
  });

  it("does not render helper action without both label and handler", () => {
    const noLabel = renderWithTheme(
      <InputBar
        onSend={() => undefined}
        helperText="Retry failed request"
        onHelperActionPress={() => undefined}
      />,
    );
    expect(noLabel.queryByTestId("chat-helper-action")).toBeNull();

    const noHandler = renderWithTheme(
      <InputBar
        onSend={() => undefined}
        helperText="Retry failed request"
        helperActionLabel="Retry"
      />,
    );
    expect(noHandler.queryByTestId("chat-helper-action")).toBeNull();
  });

  it("keeps helper action disabled when requested", () => {
    const onHelperActionPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <InputBar
        onSend={() => undefined}
        helperText="Retry failed request"
        helperActionLabel="Retry"
        onHelperActionPress={onHelperActionPress}
        helperActionDisabled
      />,
    );

    fireEvent.press(getByTestId("chat-helper-action"));
    expect(onHelperActionPress).not.toHaveBeenCalled();
  });

  it("sends on submit editing when input is valid", () => {
    const onSend = jest.fn();
    const { getByTestId } = renderWithTheme(<InputBar onSend={onSend} />);

    fireEvent.changeText(getByTestId("chat-input"), "submitted");
    fireEvent(getByTestId("chat-input"), "submitEditing");

    expect(onSend).toHaveBeenCalledWith("submitted");
  });

  it("applies pressed and released opacity styles on send button", () => {
    const { UNSAFE_getAllByType, getByTestId } = renderWithTheme(
      <InputBar onSend={() => undefined} />,
    );
    fireEvent.changeText(getByTestId("chat-input"), "hello");
    const sendButton = UNSAFE_getAllByType(Pressable).find(
      (node) => node.props.testID === "chat-send-button",
    );
    const buttonStyle = sendButton?.props.style as (state: {
      pressed: boolean;
    }) => Array<unknown>;

    const pressedStyles = buttonStyle({ pressed: true });
    const releasedStyles = buttonStyle({ pressed: false });

    expect(pressedStyles).toContainEqual(expect.objectContaining({ opacity: 0.84 }));
    expect(releasedStyles).not.toContainEqual(
      expect.objectContaining({ opacity: 0.84 }),
    );
  });
});
