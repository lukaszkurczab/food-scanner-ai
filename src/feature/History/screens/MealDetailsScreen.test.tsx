import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ActivityIndicator } from "react-native";
import MealDetailsScreen from "@/feature/History/screens/MealDetailsScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Ingredient, Meal, Nutrients } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
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
  onTypeChange?: (value: Meal["type"]) => void;
};

const mockUseMealDetailsScreenState = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { ns?: string; defaultValue?: string },
    ) => (options?.ns ? `${options.ns}:${key}` : options?.defaultValue ?? key),
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 8,
    right: 4,
    bottom: 0,
    left: 6,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("@/feature/History/hooks/useMealDetailsScreenState", () => ({
  useMealDetailsScreenState: () => mockUseMealDetailsScreenState(),
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
    PrimaryButton: ({
      label,
      onPress,
      disabled,
    }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    ErrorButton: ({
      label,
      onPress,
      disabled,
    }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    MealBox: ({
      name,
      type,
      onNameChange,
      onTypeChange,
    }: MealBoxProps) =>
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
    IngredientBox: ({
      ingredient,
      editable,
      onSave,
      onRemove,
    }: {
      ingredient: Ingredient;
      editable: boolean;
      onSave?: (ingredient: Ingredient) => void;
      onRemove?: () => void;
    }) =>
      createElement(
        View,
        null,
        createElement(Text, null, `ingredient:${ingredient.name}:${String(editable)}`),
        onSave
          ? createElement(
              Pressable,
              {
                onPress: () =>
                  onSave({
                    ...ingredient,
                    name: `${ingredient.name} updated`,
                  }),
              },
              createElement(Text, null, `save-ingredient:${ingredient.name}`),
            )
          : null,
        onRemove
          ? createElement(
              Pressable,
              { onPress: onRemove },
              createElement(Text, null, `remove-ingredient:${ingredient.name}`),
            )
          : null,
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
          )
        : null,
    ScreenCornerNavButton: ({
      onPress,
      accessibilityLabel,
    }: {
      onPress: () => void;
      accessibilityLabel?: string;
    }) =>
      createElement(
        Pressable,
        { onPress, accessibilityLabel, accessibilityRole: "button" },
        createElement(Text, null, `nav:${accessibilityLabel ?? ""}`),
      ),
  };
});

jest.mock("../components/FallbackImage", () => ({
  FallbackImage: ({
    uri,
    onError,
  }: {
    uri: string;
    onError: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");

    return createElement(
      View,
      null,
      createElement(Text, null, `fallback-image:${uri}`),
      createElement(
        Pressable,
        { onPress: onError },
        createElement(Text, null, "image-error"),
      ),
    );
  },
}));

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-02-01T12:00:00.000Z",
  type: "lunch",
  name: "Chicken bowl",
  ingredients: [
    {
      id: "ingredient-1",
      name: "Chicken",
      amount: 120,
      unit: "g",
      kcal: 220,
      protein: 30,
      carbs: 0,
      fat: 8,
    },
  ],
  createdAt: "2026-02-01T12:00:00.000Z",
  updatedAt: "2026-02-01T12:00:00.000Z",
  syncState: "synced",
  source: "saved",
  photoUrl: "file:///meal.jpg",
  ...overrides,
});

const buildNutrition = (overrides?: Partial<Nutrients>): Nutrients => ({
  kcal: 220,
  protein: 30,
  carbs: 0,
  fat: 8,
  ...overrides,
});

const buildState = (overrides?: Record<string, unknown>) => ({
  draft: buildMeal(),
  nutrition: buildNutrition(),
  showImageBlock: true,
  checkingImage: false,
  effectivePhotoUri: "file:///meal.jpg",
  onImageError: jest.fn(),
  goShare: jest.fn(),
  handleAddPhoto: jest.fn(),
  edit: false,
  saving: false,
  setName: jest.fn(),
  setType: jest.fn(),
  showIngredients: false,
  toggleIngredients: jest.fn(),
  updateIngredientAt: jest.fn(),
  removeIngredientAt: jest.fn(),
  startEdit: jest.fn(),
  handleSave: jest.fn(),
  isDirty: false,
  handleCancel: jest.fn(),
  handleBack: jest.fn(),
  showDiscardModal: false,
  confirmDiscard: jest.fn(),
  closeDiscardModal: jest.fn(),
  showLeaveModal: false,
  confirmLeave: jest.fn(),
  closeLeaveModal: jest.fn(),
  ...overrides,
});

describe("MealDetailsScreen", () => {
  beforeEach(() => {
    mockUseMealDetailsScreenState.mockReset();
  });

  it("returns null when the draft or nutrition is missing", () => {
    mockUseMealDetailsScreenState.mockReturnValue({
      draft: null,
      nutrition: null,
    });

    const screen = renderWithTheme(<MealDetailsScreen />);

    expect(screen.toJSON()).toBeNull();
  });

  it("renders without the image block when it is hidden", () => {
    const state = buildState({ showImageBlock: false });
    mockUseMealDetailsScreenState.mockReturnValue(state);

    const screen = renderWithTheme(<MealDetailsScreen />);

    expect(screen.getByText("meal-box:Chicken bowl:lunch")).toBeTruthy();
    expect(screen.queryByText("fallback-image:file:///meal.jpg")).toBeNull();
    fireEvent.press(screen.getByText("meals:edit_meal"));
    expect(state.startEdit).toHaveBeenCalledTimes(1);
  });

  it("renders the existing photo branch and forwards image actions", () => {
    const state = buildState();
    mockUseMealDetailsScreenState.mockReturnValue(state);

    const screen = renderWithTheme(<MealDetailsScreen />);

    expect(screen.getByText("fallback-image:file:///meal.jpg")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("common:share"));
    fireEvent.press(screen.getByText("image-error"));
    fireEvent.press(screen.getByLabelText("common:back"));

    expect(state.goShare).toHaveBeenCalledTimes(1);
    expect(state.onImageError).toHaveBeenCalledTimes(1);
    expect(state.handleBack).toHaveBeenCalledTimes(1);
  });

  it("renders the image loading branch", () => {
    mockUseMealDetailsScreenState.mockReturnValue(
      buildState({
        checkingImage: true,
        effectivePhotoUri: null,
      }),
    );

    const screen = renderWithTheme(<MealDetailsScreen />);

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("renders editable state, placeholder image and both confirmation modals", () => {
    const state = buildState({
      effectivePhotoUri: null,
      edit: true,
      isDirty: true,
      showIngredients: true,
      showDiscardModal: true,
      showLeaveModal: true,
    });
    mockUseMealDetailsScreenState.mockReturnValue(state);

    const screen = renderWithTheme(<MealDetailsScreen />);

    expect(screen.getByLabelText("meals:add_photo")).toBeTruthy();
    expect(screen.getByText("common:save_changes")).toBeTruthy();
    expect(screen.getByText("ingredient:Chicken:true")).toBeTruthy();
    expect(screen.getByText("meals:hide_ingredients")).toBeTruthy();
    expect(screen.getByText("meals:discard_changes_message")).toBeTruthy();
    expect(screen.getByText("meals:leave_without_saving_message")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("meals:add_photo"));
    fireEvent.press(screen.getByText("edit-name"));
    fireEvent.press(screen.getByText("edit-type"));
    fireEvent.press(screen.getByText("meals:hide_ingredients"));
    fireEvent.press(screen.getByText("save-ingredient:Chicken"));
    fireEvent.press(screen.getByText("remove-ingredient:Chicken"));
    fireEvent.press(screen.getByText("common:save_changes"));
    fireEvent.press(screen.getByText("common:cancel"));
    fireEvent.press(screen.getAllByText("common:discard")[0]);
    fireEvent.press(screen.getAllByText("common:continue")[0]);
    fireEvent.press(screen.getAllByText("common:leave")[0]);
    fireEvent.press(screen.getAllByText("common:continue")[1]);

    expect(state.handleAddPhoto).toHaveBeenCalledTimes(1);
    expect(state.setName).toHaveBeenCalledWith("Edited meal");
    expect(state.setType).toHaveBeenCalledWith("dinner");
    expect(state.toggleIngredients).toHaveBeenCalledTimes(1);
    expect(state.updateIngredientAt).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ name: "Chicken updated" }),
    );
    expect(state.removeIngredientAt).toHaveBeenCalledWith(0);
    expect(state.handleSave).toHaveBeenCalledTimes(1);
    expect(state.handleCancel).toHaveBeenCalledTimes(1);
    expect(state.confirmDiscard).toHaveBeenCalledTimes(1);
    expect(state.closeDiscardModal).toHaveBeenCalledTimes(1);
    expect(state.confirmLeave).toHaveBeenCalledTimes(1);
    expect(state.closeLeaveModal).toHaveBeenCalledTimes(1);
  });
});
