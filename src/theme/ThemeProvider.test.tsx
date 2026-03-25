import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, Pressable, Text } from "react-native";
import { ThemeProvider, THEME_MODE_STORAGE_KEY } from "@/theme/ThemeProvider";
import { useTheme } from "@/theme/useTheme";

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

describe("theme/ThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(AsyncStorage, "getItem").mockResolvedValue(null);

    jest.spyOn(AsyncStorage, "setItem").mockResolvedValue();

    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");

    jest.spyOn(Appearance, "addChangeListener").mockReturnValue({
      remove: jest.fn(),
    });
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

    await waitFor(() => {
      expect(getByTestId("theme-mode").props.children).toBe("dark");
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        THEME_MODE_STORAGE_KEY,
        "dark",
      );
    });
  });

  it("loads persisted mode on mount", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockResolvedValue("dark");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(THEME_MODE_STORAGE_KEY);
      expect(getByTestId("theme-mode").props.children).toBe("dark");
    });
  });
});
