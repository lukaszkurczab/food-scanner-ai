import type { ReactNode } from "react";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import ReviewIngredientsEditor from "@/components/ReviewIngredientsEditor";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal, Ingredient } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  children?: ReactNode;
  style?: unknown;
};

type ModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  primaryAction?: { label: string; onPress?: () => void };
  secondaryAction?: { label: string; onPress?: () => void };
};

const mockUseMealDraftContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockIngredientBox = jest.fn();

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/components/IngredientBox", () => ({
  IngredientBox: () => {
    mockIngredientBox();
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return createElement(Text, null, "ingredient-box");
  },
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
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
  const { View, Text, Pressable } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) =>
      createElement(View, null, children),
    Modal: ({
      visible,
      title,
      message,
      primaryAction,
      secondaryAction,
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
                  {
                    onPress: primaryAction.onPress,
                    accessibilityRole: "button",
                  },
                  createElement(Text, null, primaryAction.label),
                )
              : null,
            secondaryAction
              ? createElement(
                  Pressable,
                  {
                    onPress: secondaryAction.onPress,
                    accessibilityRole: "button",
                  },
                  createElement(Text, null, secondaryAction.label),
                )
              : null,
          )
        : null,
    Button: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    PhotoPreview: () => createElement(Text, null, "photo-preview"),
  };
});

const buildIngredient = (overrides?: Partial<Ingredient>): Ingredient => ({
  id: "ing-1",
  name: "Rice",
  amount: 100,
  kcal: 130,
  protein: 2,
  carbs: 28,
  fat: 1,
  ...overrides,
});

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: "lunch",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  photoUrl: null,
  ...overrides,
});

const buildDraftContext = (mealOverrides?: Partial<Meal>) => ({
  meal: buildMeal(mealOverrides),
  removeIngredient: jest.fn(),
  setLastScreen: jest.fn(async (_uid: string, _screen: string) => undefined),
  updateIngredient: jest.fn(),
  saveDraft: jest.fn(async (_uid: string) => undefined),
  addIngredient: jest.fn(),
});

describe("ReviewIngredientsEditor", () => {
  beforeEach(() => {
    mockIngredientBox.mockClear();
    mockUseAuthContext.mockReturnValue({ uid: "uid-1" });
  });

  it("creates local draft ingredient after pressing add button", () => {
    const ctx = buildDraftContext({ ingredients: [] });
    mockUseMealDraftContext.mockReturnValue(ctx);

    const { getByText } = renderWithTheme(
      <ReviewIngredientsEditor
        screenTrackingName="MealAdd"
        onContinue={jest.fn()}
        onStartOver={jest.fn()}
      />,
    );

    fireEvent.press(getByText("meals:add_ingredient"));
    expect(getByText("ingredient-box")).toBeTruthy();
  });

  it("runs continue flow when meal contains valid ingredient", () => {
    const ctx = buildDraftContext({ ingredients: [buildIngredient()] });
    mockUseMealDraftContext.mockReturnValue(ctx);
    const onContinue = jest.fn();

    const { getByText } = renderWithTheme(
      <ReviewIngredientsEditor
        screenTrackingName="MealAdd"
        onContinue={onContinue}
        onStartOver={jest.fn()}
      />,
    );

    fireEvent.press(getByText("common:continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("opens start-over modal and confirms reset action", async () => {
    const ctx = buildDraftContext({ ingredients: [buildIngredient()] });
    mockUseMealDraftContext.mockReturnValue(ctx);
    const onStartOver = jest.fn();

    const { getByText } = renderWithTheme(
      <ReviewIngredientsEditor
        screenTrackingName="MealAdd"
        onContinue={jest.fn()}
        onStartOver={onStartOver}
      />,
    );

    fireEvent.press(getByText("meals:change_method"));
    fireEvent.press(getByText("common:yes"));

    expect(onStartOver).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(ctx.setLastScreen).toHaveBeenCalledWith("uid-1", "MealAdd");
    });
  });
});
