import { fireEvent, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import ManualMealEntryScreen from "@/feature/Meals/screens/MealAdd/ManualMealEntryScreen";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
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
    Button: ({ label, onPress, disabled }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button", disabled },
        createElement(Text, null, label),
      ),
    TextInput: ({
      value,
      onChangeText,
      onBlur,
      placeholder,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      onBlur?: () => void;
      placeholder?: string;
    }) =>
      createElement(TextInput, {
        value,
        onChangeText,
        onBlur,
        placeholder,
        testID: "meal-name-input",
      }),
    Calendar: () => createElement(View, null, "calendar"),
    Clock12h: () => createElement(View, null, "clock-12h"),
    Clock24h: () => createElement(View, null, "clock-24h"),
  };
});

const buildMeal = (overrides?: Partial<Meal>): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-01-10T12:00:00.000Z",
  type: "other",
  name: null,
  ingredients: [],
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  syncState: "pending",
  source: null,
  photoUrl: null,
  inputMethod: "manual",
  ...overrides,
});

const buildProps = () =>
  ({
    navigation: { navigate: jest.fn<(screen: "Home") => void>() } as never,
    flow: {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
    } as unknown as MealAddScreenProps<"ManualMealEntry">["flow"],
    params: {},
  }) as MealAddScreenProps<"ManualMealEntry">;

describe("ManualMealEntryScreen", () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
  });

  it("persists the draft and moves to review", async () => {
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
      <ManualMealEntryScreen {...props} />,
    );

    fireEvent.changeText(getByTestId("meal-name-input"), "Manual lunch");
    fireEvent(getByTestId("meal-name-input"), "blur");
    fireEvent.press(getByText("Prepare review"));

    await waitFor(() => {
      expect(saveDraft).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          name: "Manual lunch",
          source: "manual",
          inputMethod: "manual",
        }),
      );
      expect(props.flow.replace).toHaveBeenCalledWith("ReviewMeal", {});
    });
  });
});
