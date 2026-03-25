import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ActivityIndicator, Image } from "react-native";
import EditResultScreen from "@/feature/History/screens/EditResultScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type ModalProps = {
  visible: boolean;
  message?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  primaryAction?: { label: string; onPress?: () => void };
  secondaryAction?: { label: string; onPress?: () => void };
};

const mockUseAuthContext = jest.fn();
const mockUseRoute = jest.fn();
const mockUseMealDraftContext = jest.fn();
const mockUseEditResultState = jest.fn();
const mockUseNetInfo = jest.fn<() => { isConnected: boolean | null }>();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { ns?: string; defaultValue?: string },
    ) => (options?.ns ? `${options.ns}:${key}` : options?.defaultValue ?? key),
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@/feature/History/hooks/useEditResultState", () => ({
  useEditResultState: (params: unknown) => mockUseEditResultState(params),
}));

jest.mock("@/components/DateTimeSection", () => ({
  DateTimeSection: ({
    value,
    onChange,
    addedValue,
    onChangeAdded,
  }: {
    value: Date;
    onChange: (date: Date) => void;
    addedValue?: Date;
    onChangeAdded?: (date: Date) => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");

    return createElement(
      View,
      null,
      createElement(
        Text,
        null,
        `date-time:${value.toISOString()}:${addedValue?.toISOString() ?? ""}`,
      ),
      createElement(
        Pressable,
        {
          onPress: () => onChange(new Date("2026-02-04T12:00:00.000Z")),
        },
        createElement(Text, null, "change-selected-at"),
      ),
      onChangeAdded
        ? createElement(
            Pressable,
            {
              onPress: () =>
                onChangeAdded(new Date("2026-02-03T10:00:00.000Z")),
            },
            createElement(Text, null, "change-added-at"),
          )
        : null,
    );
  },
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: React.ReactNode }) =>
      createElement(View, null, children),
    Card: ({
      children,
      onPress,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
    }) =>
      onPress
        ? createElement(Pressable, { onPress }, children)
        : createElement(View, null, children),
    Button: ({
      label,
      onPress,
      disabled,
    }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    Modal: ({
      visible,
      message,
      primaryActionLabel,
      onPrimaryAction,
      secondaryActionLabel,
      onSecondaryAction,
      primaryAction,
      secondaryAction,
    }: ModalProps) =>
      visible
        ? (() => {
            const resolvedPrimaryAction = primaryAction ?? (
              primaryActionLabel
                ? { label: primaryActionLabel, onPress: onPrimaryAction }
                : undefined
            );
            const resolvedSecondaryAction = secondaryAction ?? (
              secondaryActionLabel
                ? { label: secondaryActionLabel, onPress: onSecondaryAction }
                : undefined
            );

            return createElement(
              View,
              null,
              message ? createElement(Text, null, message) : null,
              resolvedPrimaryAction
                ? createElement(
                    Pressable,
                    { onPress: resolvedPrimaryAction.onPress },
                    createElement(Text, null, resolvedPrimaryAction.label),
                  )
                : null,
              resolvedSecondaryAction
                ? createElement(
                    Pressable,
                    { onPress: resolvedSecondaryAction.onPress },
                    createElement(Text, null, resolvedSecondaryAction.label),
                  )
                : null,
            );
          })()
        : null,
  };
});

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-02-01T12:00:00.000Z",
  type: "breakfast",
  name: "Omelette",
  ingredients: [],
  createdAt: "2026-02-01T12:00:00.000Z",
  updatedAt: "2026-02-01T12:00:00.000Z",
  syncState: "synced",
  source: "saved",
  photoUrl: "file:///omelette.jpg",
  ...overrides,
});

const buildState = (overrides?: Record<string, unknown>) => ({
  ready: true,
  meal: buildMeal(),
  checkingImage: false,
  image: "file:///omelette.jpg",
  imageError: false,
  onImageError: jest.fn(),
  goShare: jest.fn(),
  handleAddPhoto: jest.fn(),
  mealName: "Omelette",
  selectedAt: new Date("2026-02-01T12:00:00.000Z"),
  setSelectedAt: jest.fn(),
  addedAt: new Date("2026-02-01T12:00:00.000Z"),
  setAddedAt: jest.fn(),
  showIngredients: false,
  toggleIngredients: jest.fn(),
  handleSave: jest.fn(),
  saving: false,
  canSave: true,
  handleCancel: jest.fn(),
  showCancelModal: false,
  closeCancelModal: jest.fn(),
  handleCancelConfirm: jest.fn(),
  reloadFromLocal: jest.fn(async () => true),
  ...overrides,
});

describe("EditResultScreen", () => {
  beforeEach(() => {
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseRoute.mockReturnValue({ params: { savedCloudId: "cloud-1" } });
    mockUseMealDraftContext.mockReturnValue({
      meal: buildMeal(),
      setLastScreen: jest.fn<(uid: string, screen: string) => Promise<void>>(
        async (_uid: string, _screen: string) => undefined,
      ),
      setPhotoUrl: jest.fn<(url: string | null) => void>(),
    });
    mockUseEditResultState.mockReset();
  });

  it("renders unavailable fallback when meal is missing", () => {
    mockUseMealDraftContext.mockReturnValue({
      meal: null,
      setLastScreen: jest.fn<(uid: string, screen: string) => Promise<void>>(
        async (_uid: string, _screen: string) => undefined,
      ),
      setPhotoUrl: jest.fn<(url: string | null) => void>(),
    });
    const state = buildState({ ready: false, meal: null });
    mockUseEditResultState.mockReturnValue(state);

    const screen = renderWithTheme(
      <EditResultScreen navigation={{ navigate: jest.fn() } as never} />,
    );

    expect(screen.getByText("meals:editUnavailable.title")).toBeTruthy();
    expect(screen.getByText("meals:editUnavailable.desc")).toBeTruthy();

    fireEvent.press(screen.getByText("common:retry"));
    fireEvent.press(screen.getByText("meals:back_to_saved"));

    expect(state.reloadFromLocal).toHaveBeenCalledTimes(1);
    expect(state.handleCancelConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders offline unavailable fallback copy when disconnected", () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    mockUseMealDraftContext.mockReturnValue({
      meal: null,
      setLastScreen: jest.fn<(uid: string, screen: string) => Promise<void>>(
        async (_uid: string, _screen: string) => undefined,
      ),
      setPhotoUrl: jest.fn<(url: string | null) => void>(),
    });
    mockUseEditResultState.mockReturnValue(
      buildState({ ready: false, meal: null }),
    );

    const screen = renderWithTheme(
      <EditResultScreen navigation={{ navigate: jest.fn() } as never} />,
    );

    expect(screen.getByText("meals:editUnavailable.offlineDesc")).toBeTruthy();
  });

  it("renders the image branch and forwards result actions", () => {
    const state = buildState();
    const navigation = {
      navigate: jest.fn<(screen: string, params?: unknown) => void>(),
    };
    mockUseEditResultState.mockReturnValue(state);

    const screen = renderWithTheme(
      <EditResultScreen navigation={navigation as never} />,
    );

    expect(screen.getByText("meals:meal_name")).toBeTruthy();
    expect(screen.getByText("Omelette")).toBeTruthy();
    expect(
      screen.getByText(
        "date-time:2026-02-01T12:00:00.000Z:2026-02-01T12:00:00.000Z",
      ),
    ).toBeTruthy();
    expect(screen.getByText("meals:show_ingredients")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("common:share"));
    fireEvent(screen.UNSAFE_getByType(Image), "error");
    fireEvent.press(screen.getByText("change-selected-at"));
    fireEvent.press(screen.getByText("change-added-at"));
    fireEvent.press(screen.getByText("meals:show_ingredients"));
    fireEvent.press(screen.getByText("common:save"));
    fireEvent.press(screen.getByText("meals:back_to_saved"));

    expect(state.goShare).toHaveBeenCalledTimes(1);
    expect(state.onImageError).toHaveBeenCalledTimes(1);
    expect(state.setSelectedAt).toHaveBeenCalledWith(
      new Date("2026-02-04T12:00:00.000Z"),
    );
    expect(state.setAddedAt).toHaveBeenCalledWith(
      new Date("2026-02-03T10:00:00.000Z"),
    );
    expect(state.toggleIngredients).toHaveBeenCalledTimes(1);
    expect(state.handleSave).toHaveBeenCalledTimes(1);
    expect(state.handleCancel).toHaveBeenCalledTimes(1);
  });

  it("renders loading and placeholder branches", () => {
    mockUseEditResultState
      .mockReturnValueOnce(
        buildState({
          checkingImage: true,
          image: null,
        }),
      )
      .mockReturnValueOnce(
        buildState({
          image: null,
          imageError: true,
          showIngredients: true,
          showCancelModal: true,
        }),
      );

    const loading = renderWithTheme(
      <EditResultScreen navigation={{ navigate: jest.fn() } as never} />,
    );
    expect(loading.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    const placeholder = renderWithTheme(
      <EditResultScreen navigation={{ navigate: jest.fn() } as never} />,
    );
    expect(placeholder.getByLabelText("meals:add_photo")).toBeTruthy();
    expect(placeholder.getByText("meals:hide_ingredients")).toBeTruthy();
    expect(placeholder.getByText("meals:cancel_edit_message")).toBeTruthy();

    fireEvent.press(placeholder.getByLabelText("meals:add_photo"));
    fireEvent.press(placeholder.getByText("common:confirm"));
    fireEvent.press(placeholder.getByText("common:cancel"));

    const state = mockUseEditResultState.mock.results[1]?.value as ReturnType<
      typeof buildState
    >;
    expect(state.handleAddPhoto).toHaveBeenCalledTimes(1);
    expect(state.handleCancelConfirm).toHaveBeenCalledTimes(1);
    expect(state.closeCancelModal).toHaveBeenCalledTimes(1);
  });
});
