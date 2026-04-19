import { act, renderHook } from "@testing-library/react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Meal } from "@/types/meal";
import { useMealCameraState } from "@/feature/Meals/hooks/useMealCameraState";
import { getSampleMealUri } from "@/utils/devSamples";

const mockUseMealDraftContext = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUseAiCreditsContext = jest.fn();
const mockCanAfford = jest.fn(() => true);
const mockDevice = { isDevice: true };

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn()],
}));

jest.mock("expo-device", () => mockDevice);

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
  const mockedGetSampleMealUri = getSampleMealUri as jest.MockedFunction<
    typeof getSampleMealUri
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    mockDevice.isDevice = true;
    mockCanAfford.mockReturnValue(true);

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

  it("uses the mocked sample photo on simulator and skips confirmation", async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    mockDevice.isDevice = false;
    mockedGetSampleMealUri.mockResolvedValue("file:///sample-meal.jpg");

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
    const updateMeal = jest.fn();
    const saveDraft = jest.fn<
      (uid: string, draftOverride?: Meal | null) => Promise<void>
    >(async () => undefined);

    mockUseMealDraftContext.mockReturnValue({
      meal: baseMeal(),
      setMeal: jest.fn(),
      updateMeal,
      setLastScreen: jest.fn(async () => undefined),
      saveDraft,
    });

    const { result } = renderHook(() =>
      useMealCameraState({
        navigation: navigation as never,
        flow: flow as never,
        params: {
          simulatorCreditsState: "low",
          simulatorReviewState: "failed",
        },
      }),
    );

    await act(async () => {
      await result.current.handleTakePicture();
    });

    expect(mockedGetSampleMealUri).toHaveBeenCalledTimes(1);
    expect(updateMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUrl: "file:///sample-meal.jpg",
        inputMethod: "photo",
      }),
    );
    expect(saveDraft).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        photoUrl: "file:///sample-meal.jpg",
      }),
    );
    expect(flow.goTo).toHaveBeenCalledWith("PreparingReviewPhoto", {
      image: "file:///sample-meal.jpg",
      id: "meal-1",
      attempt: 1,
      simulatorCreditsState: "low",
      simulatorReviewState: "failed",
    });
  });
});
