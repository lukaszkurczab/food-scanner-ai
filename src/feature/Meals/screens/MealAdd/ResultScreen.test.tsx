import { Pressable } from "react-native";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import ResultScreen from "@/feature/Meals/screens/MealAdd/ResultScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

type CheckboxProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
};

type ModalProps = {
  visible: boolean;
  message?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

type MealBoxProps = {
  name: string;
  type: string;
  onNameChange?: (value: string) => void;
  onTypeChange?: (value: "breakfast" | "lunch" | "dinner" | "snack" | "other") => void;
};

type PhotoPreviewProps = {
  onRetake: () => void;
  onAccept: () => void;
  primaryText: string;
  secondaryText: string;
};

const mockUseAuthContext = jest.fn();
const mockUseMealDraftContext = jest.fn();
const mockUseUserContext = jest.fn();
const mockUseNetInfo = jest.fn<() => { isConnected: boolean | null }>();
const mockUseMeals = jest.fn<
  (uid: string | null) => {
    addMeal: (meal: Meal, options: { alsoSaveToMyMeals: boolean }) => Promise<void>;
    meals: Meal[];
  }
>();
const mockGetInfoAsync = jest.fn<(uri: string) => Promise<{ exists: boolean }>>();

jest.mock("expo-file-system", () => ({
  getInfoAsync: (uri: string) => mockGetInfoAsync(uri),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@contexts/UserContext", () => ({
  useUserContext: () => mockUseUserContext(),
}));

jest.mock("@hooks/useMeals", () => ({
  useMeals: (uid: string | null) => mockUseMeals(uid),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: () => mockUseNetInfo(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: unknown }) =>
      createElement(View, null, children as never),
    MealBox: ({ name, type, onNameChange, onTypeChange }: MealBoxProps) =>
      createElement(
        View,
        null,
        createElement(Text, null, `meal-box:${name}:${type}`),
        onNameChange
          ? createElement(
              Pressable,
              { onPress: () => onNameChange("Edited meal") },
              createElement(Text, null, "edit-name"),
            )
          : null,
        onTypeChange
          ? createElement(
              Pressable,
              { onPress: () => onTypeChange("dinner") },
              createElement(Text, null, "edit-type"),
            )
          : null,
      ),
    PrimaryButton: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    SecondaryButton: ({ label, onPress, disabled }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    Checkbox: ({ checked, onChange }: CheckboxProps) =>
      createElement(
        Pressable,
        {
          onPress: () => onChange(!checked),
          testID: "save-to-my-meals-checkbox",
          accessibilityRole: "checkbox",
        },
        createElement(
          Text,
          null,
          checked ? "checkbox-checked" : "checkbox-unchecked",
        ),
      ),
    ErrorButton: ({ label, onPress, disabled }: ButtonProps) =>
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
    }: ModalProps) =>
      visible
        ? createElement(
            View,
            null,
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
          )
        : null,
    PhotoPreview: ({
      onRetake,
      onAccept,
      primaryText,
      secondaryText,
    }: PhotoPreviewProps) =>
      createElement(
        View,
        null,
        createElement(Text, null, "photo-preview"),
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
  };
});

jest.mock("@/components/DateTimeSection", () => ({
  DateTimeSection: () => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "date-time-section");
  },
}));

jest.mock("@/components/ReviewIngredientsEditor", () => ({
  __esModule: true,
  default: () => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "review-ingredients-editor");
  },
}));

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-01-10T12:00:00.000Z",
  type: "breakfast",
  name: "Protein bowl",
  ingredients: [],
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  syncState: "synced",
  source: "manual",
  totals: { kcal: 350, protein: 25, carbs: 30, fat: 10 },
  photoUrl: null,
  ...overrides,
});

const buildDraftContext = (mealOverrides?: Partial<Meal>) => ({
  meal: buildMeal(mealOverrides),
  setLastScreen: jest.fn(async (_uid: string, _screen: string) => undefined),
  clearMeal: jest.fn(),
  saveDraft: jest.fn(async (_uid: string) => undefined),
  loadDraft: jest.fn(async (_uid: string) => undefined),
  setPhotoUrl: jest.fn(),
});

const buildProps = () => {
  const navigate = jest.fn<(screen: string, params?: unknown) => void>();
  const replace = jest.fn<(screen: string, params?: unknown) => void>();
  const goTo = jest.fn<(screen: string, params?: unknown) => void>();
  const flowReplace = jest.fn<(screen: string, params?: unknown) => void>();
  const goBack = jest.fn<() => void>();
  const canGoBack = jest.fn(() => true);

  return {
    navigate,
    replace,
    props: {
      navigation: {
        navigate,
        replace,
      } as unknown as MealAddScreenProps<"Result">["navigation"],
      flow: {
        goTo,
        replace: flowReplace,
        goBack,
        canGoBack,
      } as unknown as MealAddScreenProps<"Result">["flow"],
      params: {},
    } as MealAddScreenProps<"Result">,
  };
};

describe("ResultScreen", () => {
  beforeEach(() => {
    mockGetInfoAsync.mockReset();
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseUserContext.mockReturnValue({
      userData: { uid: "user-1", calorieTarget: 1000 },
    });
    mockUseMeals.mockReturnValue({
      addMeal: jest.fn(async () => undefined),
      meals: [],
    });
  });

  it("renders fallback when the authenticated user is missing", () => {
    mockUseAuthContext.mockReturnValue({ uid: null });
    mockUseMealDraftContext.mockReturnValue(buildDraftContext());

    const { props } = buildProps();
    const { getByText } = renderWithTheme(<ResultScreen {...props} />);

    expect(getByText("meals:resultUnavailable.title")).toBeTruthy();
    expect(getByText("meals:resultUnavailable.authDesc")).toBeTruthy();
    fireEvent.press(getByText("meals:select_method"));
    expect(props.navigation.replace).toHaveBeenCalledWith("MealAddMethod");
  });

  it("retries loading draft when meal data is missing", () => {
    const ctx = buildDraftContext();
    mockUseMealDraftContext.mockReturnValue({
      ...ctx,
      meal: null,
    });

    const { props } = buildProps();
    const { getByText } = renderWithTheme(<ResultScreen {...props} />);

    expect(getByText("meals:resultUnavailable.desc")).toBeTruthy();
    fireEvent.press(getByText("common:retry"));
    expect(ctx.loadDraft).toHaveBeenCalledWith("user-1");
  });

  it("renders offline fallback copy when disconnected and draft is missing", () => {
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    const ctx = buildDraftContext();
    mockUseMealDraftContext.mockReturnValue({
      ...ctx,
      meal: null,
    });

    const { props } = buildProps();
    const { getByText } = renderWithTheme(<ResultScreen {...props} />);

    expect(getByText("meals:resultUnavailable.offlineDesc")).toBeTruthy();
  });

  it("clears missing local images from the draft and persists the change", async () => {
    const ctx = buildDraftContext({ photoUrl: "file:///meal.jpg" });
    mockUseMealDraftContext.mockReturnValue(ctx);
    mockGetInfoAsync.mockResolvedValue({ exists: false });

    const { props } = buildProps();
    renderWithTheme(<ResultScreen {...props} />);

    await waitFor(() => {
      expect(ctx.setPhotoUrl).toHaveBeenCalledWith(null);
      expect(ctx.saveDraft).toHaveBeenCalledWith("user-1");
    });
    expect(ctx.setLastScreen).toHaveBeenCalledWith("user-1", "AddMeal");
  });

  it("keeps remote draft images without checking the file system", async () => {
    const ctx = buildDraftContext({ photoUrl: "https://example.com/meal.jpg" });
    mockUseMealDraftContext.mockReturnValue(ctx);

    const { props } = buildProps();
    renderWithTheme(<ResultScreen {...props} />);

    await waitFor(() => {
      expect(ctx.setLastScreen).toHaveBeenCalledWith("user-1", "AddMeal");
    });
    expect(ctx.setPhotoUrl).not.toHaveBeenCalled();
    expect(ctx.saveDraft).not.toHaveBeenCalled();
    expect(mockGetInfoAsync).not.toHaveBeenCalled();
  });

  it("opens the meal camera when there is no image yet", () => {
    const ctx = buildDraftContext({ photoUrl: null });
    const testProps = buildProps();
    mockUseMealDraftContext.mockReturnValue(ctx);

    const { getByText } = renderWithTheme(<ResultScreen {...testProps.props} />);

    fireEvent.press(getByText("meals:add_photo"));

    expect(testProps.props.flow.goTo).toHaveBeenCalledWith("MealCamera", {
      skipDetection: true,
      returnTo: "Result",
    });
  });

  it("navigates to share flow with the edited meal when image is present", async () => {
    const ctx = buildDraftContext({ photoUrl: "file:///meal.jpg" });
    const testProps = buildProps();
    mockUseMealDraftContext.mockReturnValue(ctx);

    const { getByLabelText, getByText } = renderWithTheme(
      <ResultScreen {...testProps.props} />,
    );

    await waitFor(() => {
      expect(mockGetInfoAsync).toHaveBeenCalledWith("file:///meal.jpg");
    });

    fireEvent.press(getByText("edit-name"));
    fireEvent.press(getByText("edit-type"));
    fireEvent.press(getByLabelText("common:share"));

    expect(testProps.navigate).toHaveBeenCalledWith("MealShare", {
      meal: expect.objectContaining({
        name: "Edited meal",
        type: "dinner",
        photoUrl: "file:///meal.jpg",
      }),
      returnTo: "Result",
    });
  });

  it("saves the edited meal and navigates home", async () => {
    const addMeal = jest.fn<
      (meal: Meal, options: { alsoSaveToMyMeals: boolean }) => Promise<void>
    >();
    addMeal.mockResolvedValue(undefined);
    const ctx = buildDraftContext();
    const testProps = buildProps();

    mockUseMealDraftContext.mockReturnValue(ctx);
    mockUseMeals.mockReturnValue({
      addMeal,
      meals: [
        buildMeal({
          mealId: "existing-1",
          timestamp: "2026-01-10T08:00:00.000Z",
          totals: { kcal: 200, protein: 10, carbs: 20, fat: 5 },
        }),
        buildMeal({
          mealId: "existing-2",
          timestamp: "2026-01-09T08:00:00.000Z",
          totals: { kcal: 999, protein: 10, carbs: 20, fat: 5 },
        }),
      ],
    });

    const { getByText, getByTestId } = renderWithTheme(
      <ResultScreen {...testProps.props} />,
    );

    fireEvent.press(getByText("edit-name"));
    fireEvent.press(getByText("edit-type"));
    fireEvent.press(getByTestId("save-to-my-meals-checkbox"));
    fireEvent.press(getByTestId("meal-result-save-button"));

    await waitFor(() => {
      expect(addMeal).toHaveBeenCalledTimes(1);
      expect(ctx.clearMeal).toHaveBeenCalledWith("user-1");
      expect(testProps.navigate).toHaveBeenCalledWith("Home");
    });

    expect(addMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        userUid: "user-1",
        name: "Edited meal",
        type: "dinner",
        source: "manual",
        syncState: "pending",
      }),
      { alsoSaveToMyMeals: true },
    );
  });

  it("opens the cancel modal and confirms leaving the flow", () => {
    const ctx = buildDraftContext();
    const testProps = buildProps();
    mockUseMealDraftContext.mockReturnValue(ctx);

    const { getByText } = renderWithTheme(<ResultScreen {...testProps.props} />);

    fireEvent.press(getByText("common:cancel"));
    expect(getByText("meals:confirm_exit_message")).toBeTruthy();

    fireEvent.press(getByText("common:confirm"));

    expect(ctx.clearMeal).toHaveBeenCalledWith("user-1");
    expect(testProps.navigate).toHaveBeenCalledWith("Home");
  });

  it("shows photo preview and accepts retake into camera flow", async () => {
    const ctx = buildDraftContext({ photoUrl: "file:///meal.jpg" });
    const testProps = buildProps();
    mockUseMealDraftContext.mockReturnValue(ctx);

    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <ResultScreen {...testProps.props} />,
    );

    await waitFor(() => {
      expect(mockGetInfoAsync).toHaveBeenCalledWith("file:///meal.jpg");
    });

    fireEvent.press(UNSAFE_getAllByType(Pressable)[0]);
    expect(getByText("photo-preview")).toBeTruthy();

    fireEvent.press(getByText("meals:change_photo"));

    expect(testProps.props.flow.goTo).toHaveBeenCalledWith("MealCamera", {
      skipDetection: true,
      returnTo: "Result",
    });
  });
});
