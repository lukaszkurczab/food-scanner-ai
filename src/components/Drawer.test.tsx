import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Drawer } from "@/components/Drawer";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("Drawer", () => {
  it("renders children when open", () => {
    const { getByText } = renderWithTheme(
      <Drawer open onClose={() => undefined}>
        <Text>drawer-content</Text>
      </Drawer>,
    );

    expect(getByText("drawer-content")).toBeTruthy();
  });

  it("hides children when closed", () => {
    const { queryByText } = renderWithTheme(
      <Drawer open={false} onClose={() => undefined}>
        <Text>drawer-content</Text>
      </Drawer>,
    );

    expect(queryByText("drawer-content")).toBeNull();
  });

  it("calls onClose when backdrop is pressed", () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = renderWithTheme(
      <Drawer open onClose={onClose}>
        <Text>drawer-content</Text>
      </Drawer>,
    );

    const backdrop = UNSAFE_getAllByType(Pressable)[0];
    fireEvent.press(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
