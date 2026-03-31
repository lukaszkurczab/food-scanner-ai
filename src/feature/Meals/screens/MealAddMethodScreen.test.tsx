import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import MealAddMethodScreen from "@/feature/Meals/screens/MealAddMethodScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type ModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  primaryAction?: { label: string; onPress?: () => void };
  secondaryAction?: { label: string; onPress?: () => void };
  onClose?: () => void;
};

const mockUseNavigation = jest.fn();
const mockUseRoute = jest.fn();
const mockUseMealAddMethodState = jest.fn();
const mockTrackMealAddMethodSelected = jest.fn<(optionKey: string) => Promise<void>>();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockUseNavigation(),
  useRoute: () => mockUseRoute(),
}));

jest.mock("@/feature/Meals/hooks/useMealAddMethodState", () => ({
  useMealAddMethodState: (params: unknown) => mockUseMealAddMethodState(params),
}));

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackMealAddMethodSelected: (optionKey: string) =>
    mockTrackMealAddMethodSelected(optionKey),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? `meals:${key}`,
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

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
      primaryAction,
      secondaryAction,
      onClose,
    }: ModalProps) =>
      visible
        ? createElement(
            View,
            null,
            title ? createElement(Text, null, title) : null,
            message ? createElement(Text, null, message) : null,
            primaryAction
              ? createElement(
                  Pressable,
                  { onPress: primaryAction.onPress },
                  createElement(Text, null, primaryAction.label),
                )
              : null,
            secondaryAction
              ? createElement(
                  Pressable,
                  { onPress: secondaryAction.onPress },
                  createElement(Text, null, secondaryAction.label),
                )
              : null,
            onClose
              ? createElement(
                  Pressable,
                  { onPress: onClose },
                  createElement(Text, null, "close-modal"),
                )
              : null,
          )
        : null,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

describe("MealAddMethodScreen", () => {
  beforeEach(() => {
    mockUseNavigation.mockReturnValue({
      replace: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
    });
    mockUseRoute.mockReturnValue({ params: undefined });
    mockTrackMealAddMethodSelected.mockResolvedValue();
  });

  it("renders lightweight method rows and forwards the selected option", () => {
    const options = [
      {
        key: "photo",
        icon: "camera",
        titleKey: "photoTitle",
        descKey: "photoDesc",
      },
      {
        key: "barcode",
        icon: "scan-barcode",
        titleKey: "barcodeTitle",
        descKey: "barcodeDesc",
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
    });

    const { getByTestId, getByText } = renderWithTheme(<MealAddMethodScreen />);

    expect(getByText("meals:title")).toBeTruthy();
    expect(getByText("meals:photoTitle")).toBeTruthy();
    expect(getByText("meals:barcodeTitle")).toBeTruthy();

    fireEvent.press(getByTestId("meal-add-option-photo"));
    fireEvent.press(getByTestId("meal-add-option-barcode"));

    expect(mockTrackMealAddMethodSelected).toHaveBeenNthCalledWith(1, "photo");
    expect(mockTrackMealAddMethodSelected).toHaveBeenNthCalledWith(2, "barcode");
    expect(handleOptionPress.mock.calls[0][0]).toEqual(options[0]);
    expect(handleOptionPress.mock.calls[1][0]).toEqual(options[1]);
    expect(mockUseMealAddMethodState).toHaveBeenCalledWith({
      navigation: expect.anything(),
      replaceOnStart: true,
      persistSelection: false,
    });
  });

  it("persists the selected method only for Home-driven chooser usage", () => {
    mockUseRoute.mockReturnValue({
      params: { selectionMode: "persistDefault" },
    });
    mockUseMealAddMethodState.mockReturnValue({
      options: [],
      handleOptionPress: jest.fn(),
      showResumeModal: false,
    });

    renderWithTheme(<MealAddMethodScreen />);

    expect(mockUseMealAddMethodState).toHaveBeenCalledWith({
      navigation: expect.anything(),
      replaceOnStart: true,
      persistSelection: true,
    });
  });

  it("wires resume draft modal actions", () => {
    const handleContinueDraft = jest.fn(async () => undefined);
    const handleDiscardDraft = jest.fn(async () => undefined);
    const closeResumeModal = jest.fn();

    mockUseMealAddMethodState.mockReturnValue({
      options: [],
      handleOptionPress: jest.fn(),
      showResumeModal: true,
      handleContinueDraft,
      handleDiscardDraft,
      closeResumeModal,
    });

    const { getByText } = renderWithTheme(<MealAddMethodScreen />);

    fireEvent.press(getByText("meals:resume_draft_continue"));
    fireEvent.press(getByText("meals:resume_draft_discard"));

    expect(handleContinueDraft).toHaveBeenCalledTimes(1);
    expect(handleDiscardDraft).toHaveBeenCalledTimes(1);
    expect(closeResumeModal).not.toHaveBeenCalled();
  });

  it("dismisses the sheet when tapping the overlay", () => {
    const navigation = {
      replace: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
    };
    mockUseNavigation.mockReturnValue(navigation);
    mockUseMealAddMethodState.mockReturnValue({
      options: [],
      handleOptionPress: jest.fn(),
      showResumeModal: false,
    });

    const { getAllByRole } = renderWithTheme(<MealAddMethodScreen />);

    fireEvent.press(getAllByRole("button")[0]);

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
