import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import IngredientsNotRecognizedScreen from "@/feature/Meals/screens/MealAdd/IngredientsNotRecognizedScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  children?: ReactNode;
};

const mockUseMealDraftContext = jest.fn();
const mockUseAuthContext = jest.fn();

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (ns: string) => ({
    t: (key: string, options?: { defaultValue?: string } | string) =>
      typeof options === "string"
        ? options
        : options?.defaultValue ?? `${ns}:${key}`,
  }),
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
    Button: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

const buildProps = (
  params: MealAddScreenProps<"IngredientsNotRecognized">["params"],
) =>
  ({
    navigation: {
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
    } as unknown as MealAddScreenProps<"IngredientsNotRecognized">["navigation"],
    flow: {
      goTo: jest.fn<(screen: string, params?: unknown) => void>(),
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
      goBack: jest.fn<() => void>(),
      canGoBack: jest.fn(() => true),
    } as unknown as MealAddScreenProps<"IngredientsNotRecognized">["flow"],
    params,
  }) as MealAddScreenProps<"IngredientsNotRecognized">;

describe("IngredientsNotRecognizedScreen", () => {
  beforeEach(() => {
    mockUseMealDraftContext.mockReturnValue({ clearMeal: jest.fn() });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
  });

  it("retries the camera flow before the max attempts", () => {
    const props = buildProps({
      image: "file:///meal.jpg",
      id: "meal-1",
      attempt: 2,
    });

    const { getByText } = renderWithTheme(
      <IngredientsNotRecognizedScreen {...props} />,
    );

    fireEvent.press(getByText("Retake photo (2/3)"));

    expect(props.flow.goTo).toHaveBeenCalledWith("MealCamera", {
      id: "meal-1",
      attempt: 3,
      returnTo: "IngredientsNotRecognized",
    });
  });

  it("offers manual and product database paths when AI is unavailable", () => {
    const props = buildProps({
      image: "file:///meal.jpg",
      id: "meal-1",
      reason: "ai_unavailable",
    });

    const { getByText } = renderWithTheme(
      <IngredientsNotRecognizedScreen {...props} />,
    );

    fireEvent.press(getByText("Enter ingredients manually"));
    fireEvent.press(getByText("Use product database"));
    fireEvent.press(getByText("Cancel"));

    expect(props.flow.replace).toHaveBeenCalledWith("Result", {});
    expect(props.navigation.replace).toHaveBeenCalledWith("SavedMeals");
    expect(props.flow.goBack).toHaveBeenCalledTimes(1);
  });

  it("goes back to method selection and clears the draft", () => {
    const clearMeal = jest.fn();
    mockUseMealDraftContext.mockReturnValue({ clearMeal });
    const props = buildProps({
      image: "file:///meal.jpg",
      id: "meal-1",
      attempt: 3,
    });

    const { getByText, queryByText } = renderWithTheme(
      <IngredientsNotRecognizedScreen {...props} />,
    );

    expect(queryByText("Retake photo (3/3)")).toBeNull();
    fireEvent.press(getByText("Back to method selection"));

    expect(clearMeal).toHaveBeenCalledWith("user-1");
    expect(props.navigation.replace).toHaveBeenCalledWith("MealAddMethod");
  });
});
