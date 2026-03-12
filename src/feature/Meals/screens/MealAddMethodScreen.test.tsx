import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import MealAddMethodScreen from "@/feature/Meals/screens/MealAddMethodScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

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

const mockUseNavigation = jest.fn();
const mockUseMealAddMethodState = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockUseNavigation(),
}));

jest.mock("@/feature/Meals/hooks/useMealAddMethodState", () => ({
  useMealAddMethodState: (params: unknown) => mockUseMealAddMethodState(params),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (ns: string | string[]) => {
    const defaultNs = Array.isArray(ns) ? ns[0] : ns;
    return {
    t: (key: string, options?: { defaultValue?: string; ns?: string }) =>
        options?.defaultValue ?? `${options?.ns ?? defaultNs}:${key}`,
    };
  },
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) =>
      createElement(View, null, children),
  };
});

jest.mock("@/components/Modal", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
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
                  { onPress: onPrimaryAction, accessibilityRole: "button" },
                  createElement(Text, null, primaryActionLabel),
                )
              : null,
            secondaryActionLabel
              ? createElement(
                  Pressable,
                  { onPress: onSecondaryAction, accessibilityRole: "button" },
                  createElement(Text, null, secondaryActionLabel),
                )
              : null,
            onClose
              ? createElement(
                  Pressable,
                  { onPress: onClose, accessibilityRole: "button" },
                  createElement(Text, null, "close-modal"),
                )
              : null,
          )
        : null,
  };
});

describe("MealAddMethodScreen", () => {
  beforeEach(() => {
    mockUseNavigation.mockReturnValue({ navigate: jest.fn() });
  });

  it("renders available options and forwards the selected option", () => {
    const options = [
      {
        key: "ai_photo",
        icon: "camera-alt",
        titleKey: "aiTitle",
        descKey: "aiDesc",
      },
      {
        key: "manual",
        icon: "edit",
        titleKey: "manualTitle",
        descKey: "manualDesc",
      },
    ] as const;
    const handleOptionPress = jest.fn<
      (option: (typeof options)[number]) => Promise<void>
    >();
    handleOptionPress.mockResolvedValue(undefined);
    mockUseMealAddMethodState.mockReturnValue({
      options,
      handleOptionPress,
      showResumeModal: false,
      showAiLimitModal: false,
    });

    const { getByTestId, getByText } = renderWithTheme(<MealAddMethodScreen />);

    expect(getByText("meals:title")).toBeTruthy();
    expect(getByText("chat:credits.costMultiple")).toBeTruthy();
    expect(getByText("chat:credits.costZero")).toBeTruthy();
    fireEvent.press(getByTestId("meal-add-option-ai_photo"));
    fireEvent.press(getByTestId("meal-add-option-manual"));

    expect(handleOptionPress.mock.calls[0][0]).toEqual(options[0]);
    expect(handleOptionPress.mock.calls[1][0]).toEqual(options[1]);
  });

  it("wires resume draft and AI limit modal actions", () => {
    const handleContinueDraft = jest.fn();
    const handleDiscardDraft = jest.fn();
    const closeResumeModal = jest.fn();
    const handleAiLimitUpgrade = jest.fn();
    const closeAiLimitModal = jest.fn();

    mockUseMealAddMethodState.mockReturnValue({
      options: [],
      handleOptionPress: jest.fn(),
      showResumeModal: true,
      handleContinueDraft,
      handleDiscardDraft,
      closeResumeModal,
      showAiLimitModal: true,
      handleAiLimitUpgrade,
      closeAiLimitModal,
    });

    const { getByText } = renderWithTheme(<MealAddMethodScreen />);

    fireEvent.press(getByText("meals:continue"));
    fireEvent.press(getByText("meals:discard"));
    fireEvent.press(getByText("Upgrade"));
    fireEvent.press(getByText("Close"));

    expect(handleContinueDraft).toHaveBeenCalledTimes(1);
    expect(handleDiscardDraft).toHaveBeenCalledTimes(1);
    expect(handleAiLimitUpgrade).toHaveBeenCalledTimes(1);
    expect(closeAiLimitModal).toHaveBeenCalledTimes(1);
    expect(closeResumeModal).not.toHaveBeenCalled();
  });
});
