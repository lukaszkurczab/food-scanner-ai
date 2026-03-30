import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { useMealCameraState } from "@/feature/Meals/hooks/useMealCameraState";

const mockUseMealDraftContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUseAiCreditsContext = jest.fn();
const mockCanAfford = jest.fn(() => true);

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

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => mockUseAiCreditsContext(),
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
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseAiCreditsContext.mockReturnValue({
      credits: {
        userId: "user-1",
        tier: "free",
        balance: 10,
        allocation: 100,
        periodStartAt: "2026-03-01T00:00:00.000Z",
        periodEndAt: "2026-04-01T00:00:00.000Z",
        costs: { chat: 1, textMeal: 1, photo: 5 },
      },
      canAfford: mockCanAfford,
    });
  });

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it("persists photo drafts before moving to preparing review", async () => {
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

    expect(updateMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUrl: "file:///meal.jpg",
        inputMethod: "photo",
      }),
    );
    expect(saveDraft).toHaveBeenLastCalledWith(
      "user-1",
      expect.objectContaining({
        photoUrl: "file:///meal.jpg",
        inputMethod: "photo",
      }),
    );
    expect(flow.goTo).toHaveBeenCalledWith("PreparingReviewPhoto", {
      image: "file:///meal.jpg",
      id: "meal-1",
      attempt: 1,
    });
  });

  it("replaces the camera step with review when detection is skipped", async () => {
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
      setMeal: jest.fn(),
      updateMeal: jest.fn(),
      setLastScreen: jest.fn(async () => undefined),
      saveDraft: jest.fn(async () => undefined),
    });

    const { result } = renderHook(() =>
      useMealCameraState({
        navigation: navigation as never,
        flow: flow as never,
        params: { skipDetection: true },
      }),
    );

    await act(async () => {
      await result.current.handleAccept("file:///meal.jpg");
    });

    expect(flow.replace).toHaveBeenCalledWith("ReviewMeal", {});
  });

  it("opens insufficient-credits modal when photo AI is not affordable", async () => {
    mockCanAfford.mockReturnValue(false);

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
      setMeal: jest.fn(),
      updateMeal: jest.fn(),
      setLastScreen: jest.fn(async () => undefined),
      saveDraft: jest.fn(async () => undefined),
    });

    const { result } = renderHook(() =>
      useMealCameraState({
        navigation: navigation as never,
        flow: flow as never,
        params: {},
      }),
    );

    await act(async () => {
      await result.current.handleTakePicture();
    });

    expect(result.current.premiumModal).toBe(true);
  });
});
