import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { ChatComposer } from "./ChatComposer";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("ChatComposer", () => {
  it("starts at comfortable minimum height and grows up to max with scroll", () => {
    const screen = renderWithTheme(
      <ChatComposer
        placeholder="composer.placeholder"
        sendLabel="Send"
        disabled={false}
        onSend={() => undefined}
      />,
    );

    const input = screen.getByTestId("chat-input");
    const initialStyle = StyleSheet.flatten(input.props.style);
    const minHeight = initialStyle.height;
    const maxHeight = initialStyle.maxHeight;

    expect(input.props.numberOfLines).toBe(2);
    expect(input.props.scrollEnabled).toBe(false);
    expect(initialStyle).toEqual(
      expect.objectContaining({
        height: expect.any(Number),
        maxHeight: expect.any(Number),
      }),
    );

    fireEvent(input, "contentSizeChange", {
      nativeEvent: {
        contentSize: { height: Number(maxHeight) + 80, width: 140 },
      },
    });

    const grownInput = screen.getByTestId("chat-input");
    expect(grownInput.props.scrollEnabled).toBe(true);
    expect(StyleSheet.flatten(grownInput.props.style)).toEqual(
      expect.objectContaining({
        height: maxHeight,
        maxHeight,
      }),
    );
    expect(Number(minHeight)).toBeLessThan(Number(maxHeight));
  });

  it("blocks composer when disabled and unlocks send flow when enabled", () => {
    const onSend = jest.fn();
    const screen = renderWithTheme(
      <ChatComposer
        placeholder="composer.placeholder"
        sendLabel="Send"
        disabled={false}
        onSend={onSend}
      />,
    );

    fireEvent.changeText(screen.getByTestId("chat-input"), "  hello world  ");
    fireEvent.press(screen.getByTestId("chat-send-button"));
    expect(onSend).toHaveBeenCalledWith("hello world");

    screen.rerender(
      <ChatComposer
        placeholder="composer.placeholder"
        sendLabel="Send"
        disabled
        onSend={onSend}
      />,
    );

    expect(screen.getByTestId("chat-input").props.editable).toBe(false);
    fireEvent.changeText(screen.getByTestId("chat-input"), "another message");
    fireEvent.press(screen.getByTestId("chat-send-button"));
    expect(onSend).toHaveBeenCalledTimes(1);
  });
});
