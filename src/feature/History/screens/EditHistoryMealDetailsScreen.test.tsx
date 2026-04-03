import { fireEvent, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import EditHistoryMealDetailsScreen from "@/feature/History/screens/EditHistoryMealDetailsScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { Meal } from "@/types/meal";

const mockUseRoute = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUseMeals = jest.fn();
const mockUseMealDraftContext = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/hooks/useMeals", () => ({
  useMeals: (uid: string) => mockUseMeals(uid),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

jest.mock("@/feature/Meals/screens/MealAdd/MealDetailsFormScreen", () => ({
  MealDetailsFormScreen: ({
    onReviewSubmit,
    onReviewPhotoPress,
  }: {
    onReviewSubmit?: (meal: Meal) => Promise<void> | void;
    onReviewPhotoPress?: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text, View } =
      jest.requireActual<typeof import("react-native")>("react-native");

    return createElement(
      View,
      null,
      createElement(
        Pressable,
        {
          accessibilityRole: "button",
          onPress: () => {
            void onReviewSubmit?.({
              userUid: "user-1",
              mealId: "meal-1",
              cloudId: "cloud-1",
              timestamp: "2026-01-10T12:00:00.000Z",
              type: "lunch",
              name: "Edited meal",
              ingredients: [],
              createdAt: "2026-01-10T12:00:00.000Z",
              updatedAt: "2026-01-10T12:00:00.000Z",
              syncState: "synced",
              source: "manual",
              photoUrl: "file:///meal.jpg",
            });
          },
        },
        createElement(Text, null, "submit-review-edit"),
      ),
      createElement(
        Pressable,
        {
          accessibilityRole: "button",
          onPress: onReviewPhotoPress,
        },
        createElement(Text, null, "open-photo-edit"),
      ),
    );
  },
}));

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
  photoUrl: "file:///meal.jpg",
  ...overrides,
});

describe("EditHistoryMealDetailsScreen", () => {
  beforeEach(() => {
    mockUseRoute.mockReturnValue({ params: { meal: buildMeal() } });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
  });

  it("primes the meal draft and updates the existing meal on submit", async () => {
    const navigation = {
      goBack: jest.fn<() => void>(),
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
    };
    const updateMeal = jest.fn<(meal: Meal) => Promise<void>>(
      async (_meal: Meal) => undefined,
    );
    const setMeal = jest.fn<(meal: Meal) => void>();
    const saveDraft = jest.fn<(uid: string, draft?: Meal | null) => Promise<void>>(
      async (_uid: string, _draft?: Meal | null) => undefined,
    );
    const setLastScreen = jest.fn<(uid: string, screen: string) => Promise<void>>(
      async (_uid: string, _screen: string) => undefined,
    );

    mockUseMeals.mockReturnValue({ updateMeal });
    mockUseMealDraftContext.mockReturnValue({
      meal: buildMeal(),
      setMeal,
      saveDraft,
      setLastScreen,
    });

    const screen = renderWithTheme(
      <EditHistoryMealDetailsScreen navigation={navigation as never} />,
    );

    await waitFor(() => {
      expect(setMeal).toHaveBeenCalledWith(buildMeal());
      expect(saveDraft).toHaveBeenCalledWith("user-1", buildMeal());
      expect(setLastScreen).toHaveBeenCalledWith("user-1", "EditMealDetails");
    });

    fireEvent.press(screen.getByText("submit-review-edit"));

    await waitFor(() => {
      expect(updateMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          mealId: "meal-1",
          cloudId: "cloud-1",
          name: "Edited meal",
          localPhotoUrl: undefined,
        }),
      );
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  it("opens the camera from the edit screen instead of details view", async () => {
    const navigation = {
      goBack: jest.fn<() => void>(),
      replace: jest.fn<(screen: string, params?: unknown) => void>(),
    };

    mockUseMeals.mockReturnValue({ updateMeal: jest.fn(async () => undefined) });
    mockUseMealDraftContext.mockReturnValue({
      meal: buildMeal(),
      setMeal: jest.fn(),
      saveDraft: jest.fn(async () => undefined),
      setLastScreen: jest.fn(async () => undefined),
    });

    const screen = renderWithTheme(
      <EditHistoryMealDetailsScreen navigation={navigation as never} />,
    );

    fireEvent.press(screen.getByText("open-photo-edit"));

    expect(navigation.replace).toHaveBeenCalledWith("SavedMealsCamera", {
      id: "meal-1",
      meal: buildMeal(),
      returnTo: "EditHistoryMealDetails",
    });
  });
});
