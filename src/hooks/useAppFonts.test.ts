import { renderHook } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { useAppFonts } from "@/hooks/useAppFonts";
import { useFonts } from "expo-font";

jest.mock("expo-font", () => ({
  useFonts: jest.fn(),
}));

jest.mock("../utils/loadFonts.generated", () => ({
  FONT_MAP: {
    "Extra-500": 123,
  },
}));
jest.mock("@/../assets/fonts/Inter-Regular.ttf", () => 1, { virtual: true });
jest.mock("@/../assets/fonts/Inter-Medium.ttf", () => 2, { virtual: true });
jest.mock("@/../assets/fonts/Inter-Bold.ttf", () => 3, { virtual: true });
jest.mock("@/../assets/fonts/Inter-Light.ttf", () => 4, { virtual: true });

const useFontsMock = useFonts as jest.MockedFunction<typeof useFonts>;

describe("useAppFonts", () => {
  it("passes base fonts merged with generated font map and returns loaded flag", () => {
    useFontsMock.mockReturnValue([true, null] as never);

    const { result } = renderHook(() => useAppFonts());

    expect(result.current).toBe(true);
    expect(useFontsMock).toHaveBeenCalledTimes(1);

    const arg = useFontsMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg["Inter-Regular"]).toBeTruthy();
    expect(arg["Inter-Medium"]).toBeTruthy();
    expect(arg["Inter-Bold"]).toBeTruthy();
    expect(arg["Inter-Light"]).toBeTruthy();
    expect(arg["Extra-500"]).toBe(123);
  });
});
