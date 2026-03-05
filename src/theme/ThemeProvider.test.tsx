import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, Pressable, Text } from "react-native";
import {
  ThemeProvider,
  THEME_MODE_STORAGE_KEY,
} from "@/theme/ThemeProvider";
import { useTheme } from "@/theme/useTheme";

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

describe("theme/ThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<
      typeof AsyncStorage.getItem
    >;
    const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<
      typeof AsyncStorage.setItem
    >;
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
    jest.spyOn(Appearance, "addChangeListener").mockReturnValue({
      remove: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("switches mode immediately and persists selected mode", async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    fireEvent.press(getByTestId("set-dark"));

    expect(getByTestId("theme-mode").props.children).toBe("dark");
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        THEME_MODE_STORAGE_KEY,
        "dark",
      );
    });
  });

  it("loads persisted mode on mount", async () => {
    const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<
      typeof AsyncStorage.getItem
    >;
    mockGetItem.mockResolvedValue("dark");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(getByTestId("theme-mode").props.children).toBe("dark");
    });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(THEME_MODE_STORAGE_KEY);
  });
});
