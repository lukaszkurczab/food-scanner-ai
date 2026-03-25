import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import MealTextAIScreen from "@/feature/Meals/screens/MealTextAIScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  children?: ReactNode;
};

type ModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onClose?: () => void;
};

type InputProps = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
};

const mockUseNavigation = jest.fn();
const mockUseMealTextAiState = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockUseNavigation(),
}));

jest.mock("@/feature/Meals/hooks/useMealTextAiState", () => ({
  useMealTextAiState: (params: unknown) => mockUseMealTextAiState(params),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
    i18n: { language: "en" },
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
    NumberInput: ({ label, value, onChangeText, onBlur, error }: InputProps) =>
      createElement(
        View,
        null,
        createElement(Text, null, `${label}:${value}`),
        createElement(
          Pressable,
          { onPress: () => onChangeText?.("2.5") },
          createElement(Text, null, `${label}-change`),
        ),
        createElement(
          Pressable,
          { onPress: onBlur },
          createElement(Text, null, `${label}-blur`),
        ),
        error ? createElement(Text, null, error) : null,
      ),
    Button: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    Modal: ({
      visible,
      title,
      message,
      primaryActionLabel,
      onPrimaryAction,
      secondaryActionLabel,
      onSecondaryAction,
      onClose,
    }: ModalProps) =>
      visible
        ? createElement(
            View,
            null,
            title ? createElement(Text, null, title) : null,
            message ? createElement(Text, null, message) : null,
            primaryActionLabel
              ? createElement(
                  Pressable,
                  { onPress: onPrimaryAction },
                  createElement(Text, null, primaryActionLabel),
                )
              : null,
            secondaryActionLabel
              ? createElement(
                  Pressable,
                  { onPress: onSecondaryAction },
                  createElement(Text, null, secondaryActionLabel),
                )
              : null,
            onClose
              ? createElement(
                  Pressable,
                  { onPress: onClose },
                  createElement(Text, null, "close-limit-modal"),
                )
              : null,
          )
        : null,
    ErrorBox: ({ message }: { message: string }) =>
      message ? createElement(Text, null, message) : null,
  };
});

jest.mock("@/components/LongTextInput", () => ({
  LongTextInput: ({ label, value, onChangeText, error }: InputProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, `${label}:${value}`),
      createElement(
        Pressable,
        { onPress: () => onChangeText?.(`${label}-updated`) },
        createElement(Text, null, `${label}-change`),
      ),
      error ? createElement(Text, null, error) : null,
    );
  },
}));

jest.mock("@/components/TextInput", () => ({
  TextInput: ({ label, value, onChangeText, onBlur, error }: InputProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, `${label}:${value}`),
      createElement(
        Pressable,
        { onPress: () => onChangeText?.("New meal") },
        createElement(Text, null, `${label}-change`),
      ),
      createElement(
        Pressable,
        { onPress: onBlur },
        createElement(Text, null, `${label}-blur`),
      ),
      error ? createElement(Text, null, error) : null,
    );
  },
}));

describe("MealTextAIScreen", () => {
  beforeEach(() => {
    mockUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    });
  });

  it("renders form fields and wires analyze actions", () => {
    const onNameChange = jest.fn();
    const onIngredientsChange = jest.fn();
    const onAmountChange = jest.fn();
    const onDescChange = jest.fn();
    const onNameBlur = jest.fn();
    const onAmountBlur = jest.fn();
    const onAnalyze = jest.fn();

    mockUseMealTextAiState.mockReturnValue({
      name: "Meal",
      ingPreview: "rice",
      amount: "1",
      desc: "notes",
      loading: false,
      retries: 2,
      showLimitModal: false,
      creditsUsed: 0,
      nameError: "name-error",
      amountError: "amount-error",
      ingredientsError: "ingredients-error",
      submitError: "submit-error",
      analyzeDisabled: false,
      creditAllocation: 5,
      onNameChange,
      onIngredientsChange,
      onAmountChange,
      onDescChange,
      onNameBlur,
      onAmountBlur,
      onAnalyze,
      closeLimitModal: jest.fn(),
      openPaywall: jest.fn(),
    });

    const navigation = mockUseNavigation() as {
      navigate: jest.Mock;
    };
    const { getByText } = renderWithTheme(<MealTextAIScreen />);

    expect(getByText("chat:credits.costSingle")).toBeTruthy();
    fireEvent.press(getByText("meals:meal_name-change"));
    fireEvent.press(getByText("meals:meal_name-blur"));
    fireEvent.press(getByText("meals:ingredients_optional-change"));
    fireEvent.press(getByText("meals:amount-change"));
    fireEvent.press(getByText("meals:amount-blur"));
    fireEvent.press(getByText("meals:description_optional-change"));
    fireEvent.press(getByText("meals:analyze (2/3)"));
    fireEvent.press(getByText("meals:select_method"));

    expect(onNameChange).toHaveBeenCalledWith("New meal");
    expect(onNameBlur).toHaveBeenCalledTimes(1);
    expect(onIngredientsChange).toHaveBeenCalledWith(
      "meals:ingredients_optional-updated",
    );
    expect(onAmountChange).toHaveBeenCalledWith("2.5");
    expect(onAmountBlur).toHaveBeenCalledTimes(1);
    expect(onDescChange).toHaveBeenCalledWith(
      "meals:description_optional-updated",
    );
    expect(onAnalyze).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith("MealAddMethod");
    expect(getByText("name-error")).toBeTruthy();
    expect(getByText("submit-error")).toBeTruthy();
  });

  it("shows the AI limit modal and wires its actions", () => {
    const closeLimitModal = jest.fn();
    const openPaywall = jest.fn();

    mockUseMealTextAiState.mockReturnValue({
      name: "",
      ingPreview: "",
      amount: "",
      desc: "",
      loading: false,
      retries: 0,
      showLimitModal: true,
      creditsUsed: 5,
      nameError: null,
      amountError: null,
      ingredientsError: null,
      submitError: null,
      analyzeDisabled: true,
      creditAllocation: 5,
      onNameChange: jest.fn(),
      onIngredientsChange: jest.fn(),
      onAmountChange: jest.fn(),
      onDescChange: jest.fn(),
      onNameBlur: jest.fn(),
      onAmountBlur: jest.fn(),
      onAnalyze: jest.fn(),
      closeLimitModal,
      openPaywall,
    });

    const { getByText } = renderWithTheme(<MealTextAIScreen />);

    fireEvent.press(getByText("chat:limit.upgradeCta"));
    fireEvent.press(getByText("common:cancel"));
    fireEvent.press(getByText("close-limit-modal"));

    expect(openPaywall).toHaveBeenCalledTimes(1);
    expect(closeLimitModal).toHaveBeenCalledTimes(2);
  });
});
