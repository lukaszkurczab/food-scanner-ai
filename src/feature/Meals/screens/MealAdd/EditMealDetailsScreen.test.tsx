import { fireEvent, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import EditMealDetailsScreen from "@/feature/Meals/screens/MealAdd/EditMealDetailsScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress: () => void;
};

const mockUseAuthContext = jest.fn();
const mockUseMealDraftContext = jest.fn();

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, options?: { ns?: string; defaultValue?: string }) =>
      options?.defaultValue ?? (options?.ns ? `${options.ns}:${key}` : key),
  }),
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, TextInput, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: unknown }) =>
      createElement(View, null, children as never),
    Card: ({ children }: { children?: unknown }) =>
      createElement(View, null, children as never),
    Button: ({ label, onPress }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    TextInput: ({
      value,
      onChangeText,
      onBlur,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      onBlur?: () => void;
    }) =>
      createElement(TextInput, {
        value,
        onChangeText,
        onBlur,
        testID: "meal-name-input",
      }),
    Calendar: () => createElement(View, null, "calendar"),
    Clock12h: () => createElement(View, null, "clock-12h"),
    Clock24h: () => createElement(View, null, "clock-24h"),
  };
});

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
  photoUrl: null,
  ...overrides,
});

const buildProps = () =>
  ({
    navigation: {} as never,
    flow: {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
    } as unknown as MealAddScreenProps<"EditMealDetails">["flow"],
    params: {},
  }) as MealAddScreenProps<"EditMealDetails">;

describe("EditMealDetailsScreen", () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
  });

  it("persists detail edits and returns to review", async () => {
    const saveDraft = jest.fn(async (_uid: string, _draft?: Meal | null) => undefined);
    const setMeal = jest.fn();
    const props = buildProps();

    mockUseMealDraftContext.mockReturnValue({
      meal: buildMeal(),
      loadDraft: jest.fn(async () => undefined),
      saveDraft,
      setMeal,
      setLastScreen: jest.fn(async () => undefined),
    });

    const { getByText, getByTestId } = renderWithTheme(
      <EditMealDetailsScreen {...props} />,
    );

    fireEvent.changeText(getByTestId("meal-name-input"), "Edited meal");
    fireEvent(getByTestId("meal-name-input"), "blur");
    fireEvent.press(getByText("Back to review"));

    await waitFor(() => {
      expect(setMeal).toHaveBeenCalled();
      expect(saveDraft).toHaveBeenCalled();
      expect(props.flow.goBack).toHaveBeenCalledTimes(1);
    });
  });
});
