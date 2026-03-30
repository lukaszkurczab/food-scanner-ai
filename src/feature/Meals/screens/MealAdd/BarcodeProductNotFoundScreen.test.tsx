import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import BarcodeProductNotFoundScreen from "@/feature/Meals/screens/MealAdd/BarcodeProductNotFoundScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
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

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
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
    Button: ({ label, onPress, disabled }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

const buildProps = (
  params: MealAddScreenProps<"BarcodeProductNotFound">["params"],
) =>
  ({
    navigation: {
      goBack: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    } as unknown as MealAddScreenProps<"BarcodeProductNotFound">["navigation"],
    flow: {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => false),
    } as unknown as MealAddScreenProps<"BarcodeProductNotFound">["flow"],
    params,
  }) as MealAddScreenProps<"BarcodeProductNotFound">;

describe("BarcodeProductNotFoundScreen", () => {
  it("lets the new barcode flow edit the searched code in the manual sheet", () => {
    const props = buildProps({
      code: "5901234123457",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    expect(getByText("5901234123457")).toBeTruthy();
    fireEvent.press(getByText("Edit code"));

    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {
      code: "5901234123457",
      showManualEntry: true,
    });
  });

  it("lets the new barcode flow restart scanning", () => {
    const props = buildProps({
      code: "5901234123457",
    });

    const { getByText } = renderWithTheme(
      <BarcodeProductNotFoundScreen {...props} />,
    );

    fireEvent.press(getByText("Scan again"));

    expect(props.flow.replace).toHaveBeenCalledWith("BarcodeScan", {});
  });
});
