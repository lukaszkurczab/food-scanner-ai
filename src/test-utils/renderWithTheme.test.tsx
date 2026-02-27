import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { useTheme } from "@/theme/useTheme";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const ThemeProbe = () => {
  const theme = useTheme();

  return (
    <>
      <Text testID="theme-mode">{theme.mode}</Text>
      <Pressable testID="set-dark" onPress={() => theme.setMode("dark")}>
        <Text>set dark</Text>
      </Pressable>
    </>
  );
};

describe("renderWithTheme", () => {
  it("renders content inside ThemeProvider and allows mode changes", () => {
    const { getByTestId } = renderWithTheme(<ThemeProbe />);

    expect(getByTestId("theme-mode").props.children).toBe("light");

    fireEvent.press(getByTestId("set-dark"));
    expect(getByTestId("theme-mode").props.children).toBe("dark");
  });
});
