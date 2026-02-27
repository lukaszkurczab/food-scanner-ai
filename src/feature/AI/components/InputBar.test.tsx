import { KeyboardAvoidingView, Platform, Pressable } from "react-native";
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

  it("uses custom placeholder and android keyboard behavior", () => {
    jest.replaceProperty(Platform, "OS", "android");

    const { getByPlaceholderText, UNSAFE_getByType } = renderWithTheme(
      <InputBar onSend={() => undefined} placeholder="Custom placeholder" />,
    );

    expect(getByPlaceholderText("Custom placeholder")).toBeTruthy();
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBeUndefined();
  });

  it("applies pressed and released opacity styles on send button", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <InputBar onSend={() => undefined} />,
    );
    const sendButton = UNSAFE_getAllByType(Pressable).find(
      (node) => node.props.testID === "chat-send-button",
    );
    const buttonStyle = sendButton?.props.style as (state: {
      pressed: boolean;
    }) => Array<unknown>;

    const pressedStyles = buttonStyle({ pressed: true });
    const releasedStyles = buttonStyle({ pressed: false });

    expect(pressedStyles[1]).toEqual(expect.objectContaining({ opacity: 0.9 }));
    expect(releasedStyles[1]).toEqual(expect.objectContaining({ opacity: 1 }));
  });
});
