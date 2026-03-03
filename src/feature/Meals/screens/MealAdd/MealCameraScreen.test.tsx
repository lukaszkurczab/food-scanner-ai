import type { ReactNode } from "react";
import { Linking } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import MealCameraScreen from "@/feature/Meals/screens/MealAdd/MealCameraScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type PhotoPreviewProps = {
  photoUri: string;
  onRetake: () => void;
  onAccept: () => void;
  primaryText: string;
  secondaryText: string;
};

type ScreenCornerNavButtonProps = {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
};

type AlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  primaryAction: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
};

type LoaderProps = {
  text: string;
  subtext: string;
};

type CameraViewProps = {
  onCameraReady?: () => void;
  onBarcodeScanned?: (payload: { data: string }) => void;
};

const mockUseMealCameraState = jest.fn();
const mockOpenSettings = jest.fn();

jest.mock("@/feature/Meals/hooks/useMealCameraState", () => ({
  useMealCameraState: (params: unknown) => mockUseMealCameraState(params),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 4, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: ({ name }: { name: string }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, name);
  },
}));

jest.mock("expo-camera", () => ({
  CameraView: ({ onCameraReady, onBarcodeScanned }: CameraViewProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");

    return createElement(
      View,
      null,
      createElement(Text, null, "camera-view"),
      createElement(
        Pressable,
        { onPress: onCameraReady, accessibilityRole: "button" },
        createElement(Text, null, "camera-ready"),
      ),
      createElement(
        Pressable,
        {
          onPress: () => onBarcodeScanned?.({ data: "1234567890" }),
          accessibilityRole: "button",
        },
        createElement(Text, null, "barcode-scan"),
      ),
    );
  },
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
    PhotoPreview: ({
      photoUri,
      onRetake,
      onAccept,
      primaryText,
      secondaryText,
    }: PhotoPreviewProps) =>
      createElement(
        View,
        null,
        createElement(Text, null, photoUri),
        createElement(
          Pressable,
          { onPress: onRetake, accessibilityRole: "button" },
          createElement(Text, null, secondaryText),
        ),
        createElement(
          Pressable,
          { onPress: onAccept, accessibilityRole: "button" },
          createElement(Text, null, primaryText),
        ),
      ),
    ScreenCornerNavButton: ({
      icon,
      onPress,
      accessibilityLabel,
    }: ScreenCornerNavButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, `${icon}:${accessibilityLabel}`),
      ),
  };
});

jest.mock("@/components/Alert", () => ({
  Alert: ({
    visible,
    title,
    message,
    onClose,
    primaryAction,
    secondaryAction,
  }: AlertProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");

    return visible
      ? createElement(
          View,
          null,
          createElement(Text, null, title),
          createElement(Text, null, message),
          createElement(
            Pressable,
            { onPress: primaryAction.onPress, accessibilityRole: "button" },
            createElement(Text, null, primaryAction.label),
          ),
          secondaryAction
            ? createElement(
                Pressable,
                { onPress: secondaryAction.onPress, accessibilityRole: "button" },
                createElement(Text, null, secondaryAction.label),
              )
            : null,
          createElement(
            Pressable,
            { onPress: onClose, accessibilityRole: "button" },
            createElement(Text, null, "close-alert"),
          ),
        )
      : null;
  },
}));

jest.mock("@feature/Meals/components/Loader", () => ({
  __esModule: true,
  default: ({ text, subtext }: LoaderProps) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(
      View,
      null,
      createElement(Text, null, text),
      createElement(Text, null, subtext),
    );
  },
}));

const buildHookState = (overrides?: Partial<ReturnType<typeof baseHookState>>) => ({
  ...baseHookState(),
  ...overrides,
});

function baseHookState() {
  return {
    permission: { granted: true, canAskAgain: true },
    requestPermission: jest.fn(),
    cameraRef: { current: null },
    isCameraReady: true,
    isTakingPhoto: false,
    photoUri: null as string | null,
    isLoading: false,
    premiumModal: false,
    barcodeModal: false,
    scannedCode: null as string | null,
    mode: "ai" as "ai" | "barcode",
    isPremium: true,
    skipDetection: false,
    barcodeOnly: false,
    showBarcodeOverlay: false,
    barcodeTypes: ["ean13"],
    setIsCameraReady: jest.fn(),
    handleTakePicture: jest.fn(async () => undefined),
    handleAccept: jest.fn(async () => undefined),
    handleRetake: jest.fn(),
    onBarcodeScanned: jest.fn(),
    onUseSample: jest.fn(async () => undefined),
    openAiMode: jest.fn(),
    openBarcodeMode: jest.fn(),
    closePremiumModal: jest.fn(),
    closeBarcodeModal: jest.fn(),
    goManagePremium: jest.fn(),
  };
}

const buildProps = () =>
  ({
    navigation: {
      goBack: jest.fn(),
    } as unknown as MealAddScreenProps<"MealCamera">["navigation"],
    flow: {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
    } as unknown as MealAddScreenProps<"MealCamera">["flow"],
    params: {},
  }) as MealAddScreenProps<"MealCamera">;

describe("MealCameraScreen", () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    mockUseMealCameraState.mockReset();
    mockOpenSettings.mockReset();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest
      .spyOn(Linking, "openSettings")
      .mockImplementation(async () => Promise.resolve());
  });

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it("renders an empty layout while camera permission is loading", () => {
    mockUseMealCameraState.mockReturnValue(
      buildHookState({ permission: null as never }),
    );

    const { queryByText } = renderWithTheme(<MealCameraScreen {...buildProps()} />);

    expect(queryByText("camera-view")).toBeNull();
    expect(queryByText("common:continue")).toBeNull();
  });

  it("requests permission when access can still be asked for", () => {
    const hookState = buildHookState({
      permission: { granted: false, canAskAgain: true },
    });
    mockUseMealCameraState.mockReturnValue(hookState);

    const { getByText } = renderWithTheme(<MealCameraScreen {...buildProps()} />);

    fireEvent.press(getByText("common:continue"));
    expect(hookState.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("opens system settings when camera permission is blocked", () => {
    mockUseMealCameraState.mockReturnValue(
      buildHookState({
        permission: { granted: false, canAskAgain: false },
      }),
    );

    const { getByText } = renderWithTheme(<MealCameraScreen {...buildProps()} />);

    fireEvent.press(getByText("common:continue"));
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it("renders the loader for barcode lookup and AI analysis", () => {
    mockUseMealCameraState
      .mockReturnValueOnce(
        buildHookState({
          isLoading: true,
          mode: "barcode",
          skipDetection: false,
        }),
      )
      .mockReturnValueOnce(
        buildHookState({
          isLoading: true,
          mode: "ai",
        }),
      );

    const barcode = renderWithTheme(<MealCameraScreen {...buildProps()} />);
    expect(barcode.getByText("Looking up product...")).toBeTruthy();

    const ai = renderWithTheme(<MealCameraScreen {...buildProps()} />);
    expect(ai.getByText("Analyzing your meal...")).toBeTruthy();
  });

  it("renders photo preview actions when a photo was captured", () => {
    const hookState = buildHookState({
      photoUri: "file:///meal.jpg",
    });
    mockUseMealCameraState.mockReturnValue(hookState);

    const { getByText } = renderWithTheme(<MealCameraScreen {...buildProps()} />);

    fireEvent.press(getByText("common:camera_retake"));
    fireEvent.press(getByText("common:camera_use_photo"));

    expect(hookState.handleRetake).toHaveBeenCalledTimes(1);
    expect(hookState.handleAccept).toHaveBeenCalledTimes(1);
  });

  it("renders the active camera UI and forwards actions", () => {
    const props = buildProps();
    const hookState = buildHookState({
      mode: "barcode",
      scannedCode: "5901234123457",
      showBarcodeOverlay: true,
      premiumModal: true,
      barcodeModal: true,
    });
    mockUseMealCameraState.mockReturnValue(hookState);

    const { getByText } = renderWithTheme(<MealCameraScreen {...props} />);

    fireEvent.press(getByText("back:Back"));
    fireEvent.press(getByText("psychology"));
    fireEvent.press(getByText("qr-code-scanner"));
    fireEvent.press(getByText("meals:dev.sample_meal"));
    fireEvent.press(getByText("Go Premium"));
    fireEvent.press(getByText("OK"));

    expect(getByText("Detected: 5901234123457")).toBeTruthy();
    expect(props.flow.goBack).toHaveBeenCalledTimes(1);
    expect(hookState.openAiMode).toHaveBeenCalledTimes(1);
    expect(hookState.openBarcodeMode).toHaveBeenCalledTimes(1);
    expect(hookState.onUseSample).toHaveBeenCalledTimes(1);
    expect(hookState.goManagePremium).toHaveBeenCalledTimes(1);
    expect(hookState.closeBarcodeModal).toHaveBeenCalledTimes(1);
  });

  it("falls back to navigation.goBack when the flow cannot step back", () => {
    const props = buildProps();
    props.flow.canGoBack = jest.fn(() => false) as never;
    mockUseMealCameraState.mockReturnValue(buildHookState());

    const { getByText } = renderWithTheme(<MealCameraScreen {...props} />);

    fireEvent.press(getByText("close:Close"));
    expect(props.navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
