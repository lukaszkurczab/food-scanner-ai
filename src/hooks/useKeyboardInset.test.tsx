import { Keyboard, Platform, Text } from "react-native";
import { act } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const listeners = new Map<string, (event?: { endCoordinates?: { height?: number } }) => void>();

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 16, left: 0 }),
}));

function Probe() {
  const inset = useKeyboardInset();
  return <Text testID="keyboard-inset-value">{String(inset)}</Text>;
}

describe("useKeyboardInset", () => {
  afterEach(() => {
    listeners.clear();
    jest.restoreAllMocks();
  });

  it("tracks keyboard height and excludes bottom safe-area inset", () => {
    jest
      .spyOn(Keyboard, "addListener")
      .mockImplementation(((eventName: string, callback: unknown) => {
        listeners.set(
          eventName,
          callback as (event?: { endCoordinates?: { height?: number } }) => void,
        );
        return { remove: jest.fn() } as never;
      }) as typeof Keyboard.addListener);

    const showEventName =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEventName =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const { getByTestId } = renderWithTheme(<Probe />);
    expect(getByTestId("keyboard-inset-value").props.children).toBe("0");

    act(() => {
      listeners.get(showEventName)?.({
        endCoordinates: { height: 300 },
      });
    });
    expect(getByTestId("keyboard-inset-value").props.children).toBe("284");

    act(() => {
      listeners.get(hideEventName)?.();
    });
    expect(getByTestId("keyboard-inset-value").props.children).toBe("0");
  });
});
