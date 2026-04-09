import { BackHandler } from "react-native";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import SavedMealsCameraScreen from "@/feature/History/screens/SavedMealsCameraScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

const mockUseRoute = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUseMeals = jest.fn();
const mockGetSampleMealUri = jest.fn<() => Promise<string>>();
const mockBackHandlerAddEventListener = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@hooks/useMeals", () => ({
  useMeals: (uid: string) => mockUseMeals(uid),
}));

jest.mock("@/utils/devSamples", () => ({
  getSampleMealUri: () => mockGetSampleMealUri(),
}));

jest.mock("expo-camera", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");

  return {
    CameraView: React.forwardRef(function MockCameraView(
      {
        onCameraReady,
      }: {
        onCameraReady?: () => void;
      },
      _ref,
    ) {
      React.useEffect(() => {
        onCameraReady?.();
      }, [onCameraReady]);

      return React.createElement(View, { testID: "saved-meals-camera" });
    }),
    useCameraPermissions: () => [
      { granted: true },
      jest.fn(async () => undefined),
    ],
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 12,
    left: 0,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { ns?: string; defaultValue?: string },
    ) => options?.defaultValue ?? (options?.ns ? `${options.ns}:${key}` : key),
  }),
}));

jest.mock("@/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    Button: ({
      label,
      onPress,
    }: {
      label: string;
      onPress: () => void;
    }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        React.createElement(Text, null, label),
      ),
    PhotoPreview: ({
      onRetake,
      onAccept,
    }: {
      onRetake: () => void;
      onAccept: () => void;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, "photo-preview"),
        React.createElement(
          Pressable,
          { onPress: onRetake },
          React.createElement(Text, null, "retake-photo"),
        ),
        React.createElement(
          Pressable,
          { onPress: onAccept },
          React.createElement(Text, null, "accept-photo"),
        ),
      ),
  };
});

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  cloudId: "cloud-1",
  timestamp: "2026-01-10T12:00:00.000Z",
  type: "lunch",
  name: "Chicken bowl",
  ingredients: [],
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  syncState: "synced",
  source: "manual",
  photoUrl: null,
  ...overrides,
});

describe("SavedMealsCameraScreen", () => {
  beforeEach(() => {
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation(
        ((_eventName: string, _listener: () => boolean) => {
          mockBackHandlerAddEventListener(_listener);
          return { remove: jest.fn() };
        }) as typeof BackHandler.addEventListener,
      );

    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseRoute.mockReturnValue({
      params: {
        meal: buildMeal(),
        returnTo: "EditHistoryMealDetails",
      },
    });
    mockUseMeals.mockReturnValue({
      updateMeal: jest.fn(async () => undefined),
    });
    mockGetSampleMealUri.mockResolvedValue("file:///new-photo.jpg");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a bottom return CTA and no top-left close affordance", () => {
    const navigation = {
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
      addListener: jest.fn(() => jest.fn()),
    };

    const screen = renderWithTheme(
      <SavedMealsCameraScreen navigation={navigation as never} />,
    );

    expect(screen.getByText("Back to edit")).toBeTruthy();
    expect(screen.queryByLabelText("Close")).toBeNull();

    fireEvent.press(screen.getByText("Back to edit"));

    expect(navigation.replace).toHaveBeenCalledWith("EditHistoryMealDetails", {
      meal: buildMeal(),
    });
  });

  it("returns deterministically on hardware back before capture", () => {
    const navigation = {
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
      addListener: jest.fn(() => jest.fn()),
    };

    renderWithTheme(<SavedMealsCameraScreen navigation={navigation as never} />);

    const listener = mockBackHandlerAddEventListener.mock.calls[0]?.[0] as
      | (() => boolean)
      | undefined;

    let handled = false;
    act(() => {
      handled = listener?.() ?? false;
    });

    expect(handled).toBe(true);
    expect(navigation.replace).toHaveBeenCalledWith("EditHistoryMealDetails", {
      meal: buildMeal(),
    });
  });

  it("accepts a new photo and returns to the edit screen with updated meal data", async () => {
    const updateMeal = jest.fn<(meal: Meal) => Promise<void>>(
      async (_meal: Meal) => undefined,
    );
    const navigation = {
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
      addListener: jest.fn(() => jest.fn()),
    };

    mockUseMeals.mockReturnValue({ updateMeal });
    mockUseRoute.mockReturnValue({
      params: {
        meal: buildMeal({
          localPhotoUrl: "https://remote.example.com/old.jpg",
          photoLocalPath: null,
          photoUrl: "https://remote.example.com/old.jpg",
        }),
        returnTo: "EditHistoryMealDetails",
      },
    });

    const screen = renderWithTheme(
      <SavedMealsCameraScreen navigation={navigation as never} />,
    );

    fireEvent.press(screen.getByText("meals:dev.sample_meal"));

    await waitFor(() => {
      expect(screen.getByText("photo-preview")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("accept-photo"));

    await waitFor(() => {
      expect(updateMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          mealId: "meal-1",
          photoUrl: "file:///new-photo.jpg",
          localPhotoUrl: "file:///new-photo.jpg",
          photoLocalPath: "file:///new-photo.jpg",
        }),
      );
      expect(navigation.replace).toHaveBeenCalledWith(
        "EditHistoryMealDetails",
        {
          meal: expect.objectContaining({
            mealId: "meal-1",
            photoUrl: "file:///new-photo.jpg",
            localPhotoUrl: "file:///new-photo.jpg",
            photoLocalPath: "file:///new-photo.jpg",
          }),
        },
      );
    });
  });
});
