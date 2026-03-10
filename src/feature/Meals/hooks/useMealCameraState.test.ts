import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { useMealCameraState } from "@/feature/Meals/hooks/useMealCameraState";

const mockDetectIngredientsWithVision = jest.fn<
  (uid: string, imageUri: string, opts?: { isPremium?: boolean; lang?: string }) => Promise<
    Array<{
      id: string;
      name: string;
      amount: number;
      unit: "g" | "ml";
      protein: number;
      carbs: number;
      fat: number;
      kcal: number;
    }> | null
  >
>();
const mockUseMealDraftContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUsePremiumContext = jest.fn();
const mockUseUserContext = jest.fn();

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/context/PremiumContext", () => ({
  usePremiumContext: () => mockUsePremiumContext(),
}));

jest.mock("@contexts/UserContext", () => ({
  useUserContext: () => mockUseUserContext(),
}));

jest.mock("@/services/visionService", () => ({
  detectIngredientsWithVision: (
    uid: string,
    imageUri: string,
    opts?: { isPremium?: boolean; lang?: string },
  ) => mockDetectIngredientsWithVision(uid, imageUri, opts),
}));

jest.mock("@/services/barcodeService", () => ({
  fetchProductByBarcode: jest.fn(),
  extractBarcodeFromPayload: (value: string) => value,
}));

jest.mock("@/utils/devSamples", () => ({
  getSampleMealUri: jest.fn(),
}));

const baseMeal = (): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-01T10:00:00.000Z",
  type: "other",
  name: null,
  ingredients: [],
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-01T10:00:00.000Z",
  syncState: "pending",
  source: null,
  photoUrl: null,
});

describe("useMealCameraState", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUsePremiumContext.mockReturnValue({ isPremium: true });
    mockUseUserContext.mockReturnValue({ language: "en" });
  });

  it("persists analyzed photo drafts with AI source before opening result screen", async () => {
    const setMeal = jest.fn();
    const updateMeal = jest.fn();
    const setLastScreen = jest.fn(async () => undefined);
    const saveDraft = jest.fn<
      (uid: string, draftOverride?: Meal | null) => Promise<void>
    >(async () => undefined);
    const flow = {
      goTo: jest.fn(),
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => false),
    };
    const navigation = {
      addListener: jest.fn(() => () => undefined),
      navigate: jest.fn(),
    };

    mockUseMealDraftContext.mockReturnValue({
      meal: baseMeal(),
      setMeal,
      updateMeal,
      setLastScreen,
      saveDraft,
    });

    const ingredients = [
      {
        id: "ing-1",
        name: "Chicken",
        amount: 100,
        unit: "g" as const,
        protein: 22,
        carbs: 0,
        fat: 4,
        kcal: 130,
      },
    ];
    mockDetectIngredientsWithVision.mockResolvedValue(ingredients);

    const { result } = renderHook(() =>
      useMealCameraState({
        navigation: navigation as never,
        flow: flow as never,
        params: {},
      }),
    );

    await act(async () => {
      await result.current.handleAccept("file:///meal.jpg");
    });

    expect(mockDetectIngredientsWithVision).toHaveBeenCalledWith(
      "user-1",
      "file:///meal.jpg",
      expect.objectContaining({ isPremium: true, lang: "en" }),
    );
    expect(updateMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "ai",
        photoUrl: "file:///meal.jpg",
        ingredients,
      }),
    );
    expect(saveDraft).toHaveBeenLastCalledWith(
      "user-1",
      expect.objectContaining({
        source: "ai",
        photoUrl: "file:///meal.jpg",
        ingredients,
      }),
    );
    expect(flow.goTo).toHaveBeenCalledWith("Result", {});
  });
});
