import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";

const mockNetInfoFetch = jest.fn<() => Promise<{ isConnected: boolean }>>();
const mockUseNavigation = jest.fn();
const mockUseAuthContext = jest.fn();
const mockUseMealDraftContext = jest.fn();
const mockUseAiCreditsContext = jest.fn();
const mockExtractIngredientsFromText = jest.fn<
  (...args: unknown[]) => Promise<unknown>
>();
const mockApplyCreditsFromResponse = jest.fn();
const mockRefreshCredits = jest.fn<() => Promise<unknown>>();
const mockCanAfford = jest.fn(() => true);

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: (...args: []) => mockNetInfoFetch(...args) },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockUseNavigation(),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@contexts/MealDraftContext", () => ({
  useMealDraftContext: () => mockUseMealDraftContext(),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => mockUseAiCreditsContext(),
}));

jest.mock("@/services/ai/textMealService", () => ({
  extractIngredientsFromText: (...args: unknown[]) =>
    mockExtractIngredientsFromText(...args),
}));

jest.mock("@/components", () => ({
  Toast: { show: jest.fn() },
}));

describe("useMealTextAiState", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (
      global as unknown as { requestAnimationFrame: (cb: () => void) => number }
    ).requestAnimationFrame = (cb: () => void) => {
      cb();
      return 0;
    };

    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockUseNavigation.mockReturnValue({
      replace: jest.fn(),
      navigate: jest.fn(),
    });
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
    mockUseMealDraftContext.mockReturnValue({
      meal: null,
      setMeal: jest.fn(),
      saveDraft: jest.fn(async () => undefined),
      setLastScreen: jest.fn(async () => undefined),
    });
    mockCanAfford.mockReturnValue(true);
    mockUseAiCreditsContext.mockReturnValue({
      credits: {
        userId: "user-1",
        tier: "free",
        balance: 100,
        allocation: 100,
        periodStartAt: "2026-03-01T00:00:00.000Z",
        periodEndAt: "2026-04-01T00:00:00.000Z",
        costs: { chat: 1, textMeal: 1, photo: 5 },
      },
      canAfford: mockCanAfford,
      applyCreditsFromResponse: mockApplyCreditsFromResponse,
      refreshCredits: mockRefreshCredits,
    });
  });

  it("shows limit modal when user cannot afford text meal analysis", async () => {
    mockCanAfford.mockReturnValue(false);

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
      }),
    );

    act(() => {
      result.current.onNameChange("Chicken and rice");
      result.current.onIngredientsChange("chicken, rice");
    });

    await act(async () => {
      await result.current.onAnalyze();
    });

    expect(result.current.showLimitModal).toBe(true);
    expect(mockExtractIngredientsFromText).not.toHaveBeenCalled();
  });

  it("applies credits from successful AI response", async () => {
    const navigation = { replace: jest.fn(), navigate: jest.fn() };
    const setMeal = jest.fn();
    const saveDraft = jest.fn<
      (uid: string, draftOverride?: unknown) => Promise<void>
    >(async () => undefined);
    const setLastScreen = jest.fn(async () => undefined);
    mockUseNavigation.mockReturnValue(navigation);
    mockUseMealDraftContext.mockReturnValue({
      meal: null,
      setMeal,
      saveDraft,
      setLastScreen,
    });
    mockExtractIngredientsFromText.mockResolvedValue({
      ingredients: [
        {
          id: "ing-1",
          name: "Chicken",
          amount: 100,
          unit: "g",
          protein: 22,
          carbs: 0,
          fat: 4,
          kcal: 130,
        },
      ],
      credits: {
        userId: "user-1",
        tier: "free",
        balance: 99,
        allocation: 100,
        periodStartAt: "2026-03-01T00:00:00.000Z",
        periodEndAt: "2026-04-01T00:00:00.000Z",
        costs: { chat: 1, textMeal: 1, photo: 5 },
        model: "gpt-5.4-mini",
        runId: "run-1",
        confidence: 0.91,
        warnings: ["partial_totals"],
      },
    });

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
      }),
    );

    act(() => {
      result.current.onNameChange("Chicken and rice");
      result.current.onIngredientsChange("chicken, rice");
    });

    await act(async () => {
      await result.current.onAnalyze();
    });

    expect(mockApplyCreditsFromResponse).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 99 }),
    );
    expect(setMeal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        inputMethod: "text",
        aiMeta: {
          model: "gpt-5.4-mini",
          runId: "run-1",
          confidence: 0.91,
          warnings: ["partial_totals"],
        },
      }),
    );
    expect(saveDraft).toHaveBeenLastCalledWith(
      "user-1",
      expect.objectContaining({
        inputMethod: "text",
        aiMeta: {
          model: "gpt-5.4-mini",
          runId: "run-1",
          confidence: 0.91,
          warnings: ["partial_totals"],
        },
      }),
    );
    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("AddMeal", { start: "Result" });
    });
  });

  it("refreshes credits and opens modal on backend 402", async () => {
    mockExtractIngredientsFromText.mockRejectedValueOnce(
      Object.assign(new Error("payment required"), { status: 402 }),
    );
    mockRefreshCredits.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
      }),
    );

    act(() => {
      result.current.onNameChange("Chicken and rice");
      result.current.onIngredientsChange("chicken, rice");
    });

    await act(async () => {
      await result.current.onAnalyze();
    });

    expect(mockRefreshCredits).toHaveBeenCalledTimes(1);
    expect(result.current.showLimitModal).toBe(true);
  });
});
