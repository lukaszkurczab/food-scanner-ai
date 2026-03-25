import { Pressable, Text } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { useTheme } from "@/theme/useTheme";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const ThemeProbe = () => {
  const { mode, setMode } = useTheme();

  return (
    <>
      <Text testID="theme-mode">{mode}</Text>
      <Pressable testID="set-dark" onPress={() => setMode("dark")}>
        <Text>set dark</Text>
      </Pressable>
    </>
  );
};

describe("renderWithTheme", () => {
  it("renders content inside ThemeProvider and allows mode changes", async () => {
    const { getByTestId } = renderWithTheme(<ThemeProbe />);

    await waitFor(() => {
      expect(getByTestId("theme-mode").props.children).toBe("light");
    });

    fireEvent.press(getByTestId("set-dark"));

    await waitFor(() => {
      expect(getByTestId("theme-mode").props.children).toBe("dark");
    });
  });
});
