import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import BarcodeProductNotFoundScreen from "@/feature/Meals/screens/MealAdd/BarcodeProductNotFoundScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  children?: ReactNode;
};

jest.mock("react-i18next", () => ({
  useTranslation: (ns: string) => ({
    t: (key: string, options?: { defaultValue?: string } | string) =>
      typeof options === "string"
        ? options
        : options?.defaultValue ?? `${ns}:${key}`,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) =>
      createElement(View, null, children),
    PrimaryButton: ({ label, onPress }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    SecondaryButton: ({ label, onPress }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

const buildProps = (
  params: MealAddScreenProps<"BarcodeProductNotFound">["params"],
) =>
  ({
    navigation: {
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
    } as unknown as MealAddScreenProps<"BarcodeProductNotFound">["navigation"],
    flow: {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
    } as unknown as MealAddScreenProps<"BarcodeProductNotFound">["flow"],
    params,
  }) as MealAddScreenProps<"BarcodeProductNotFound">;

describe("BarcodeProductNotFoundScreen", () => {
  it("retries barcode scanning before the last attempt", () => {
    const props = buildProps({
      code: "5901234123457",
      attempt: 1,
      returnTo: "IngredientsNotRecognized",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Scan again (1/3)"));

    expect(getByText("Scanned code: 5901234123457")).toBeTruthy();
    expect(props.navigation.replace).toHaveBeenCalledWith("AddMeal", {
      start: "MealCamera",
      barcodeOnly: true,
      attempt: 2,
      returnTo: "IngredientsNotRecognized",
    });
  });

  it("returns to the result step after the last attempt", () => {
    const props = buildProps({
      attempt: 3,
    });

    const { getByText, queryByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    expect(queryByText("Scan again (3/3)")).toBeNull();
    fireEvent.press(getByText("Back to ingredients"));

    expect(props.navigation.replace).toHaveBeenCalledWith("AddMeal", {
      start: "Result",
    });
  });
});
