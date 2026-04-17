import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";

const mockUseNavigation = jest.fn();
const mockUseAiCreditsContext = jest.fn();
const mockCanAfford = jest.fn(() => true);
const mockRefreshCredits = jest.fn<() => Promise<unknown>>();
const mockApplyCreditsFromResponse = jest.fn<(value: unknown) => unknown>();
const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockUseNavigation(),
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/context/AiCreditsContext", () => ({
  useAiCreditsContext: () => mockUseAiCreditsContext(),
}));

describe("useMealTextAiState", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: jest.fn(),
    });
    mockCanAfford.mockReturnValue(true);
    mockRefreshCredits.mockResolvedValue(null);
    mockApplyCreditsFromResponse.mockImplementation((value: unknown) => value);
    mockPost.mockResolvedValue(null);
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
      refreshCredits: mockRefreshCredits,
      applyCreditsFromResponse: mockApplyCreditsFromResponse,
    });
  });

  it("shows limit modal when user cannot afford text meal analysis", async () => {
    const flow = { goTo: jest.fn() };
    mockCanAfford.mockReturnValue(false);
    mockRefreshCredits.mockResolvedValue({
      userId: "user-1",
      tier: "free",
      balance: 0,
      allocation: 100,
      periodStartAt: "2026-03-01T00:00:00.000Z",
      periodEndAt: "2026-04-01T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
    });

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
        flow,
      }),
    );

    act(() => {
      result.current.onNameChange("Chicken and rice");
    });
    act(() => {
      result.current.onQuickDescriptionChange("Chicken and rice with cucumber");
    });
    await act(async () => {
      await result.current.onAnalyze();
    });

    expect(result.current.showLimitModal).toBe(true);
    expect(flow.goTo).not.toHaveBeenCalled();
  });

  it("routes valid text input to the analyzing step", async () => {
    const flow = { goTo: jest.fn() };

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
        flow,
      }),
    );

    act(() => {
      result.current.onNameChange("Chicken and rice");
    });
    act(() => {
      result.current.onQuickDescriptionChange("Chicken and rice with cucumber");
    });
    await act(async () => {
      await result.current.onAnalyze();
    });

    expect(flow.goTo).toHaveBeenCalledWith(
      "TextAnalyzing",
      expect.objectContaining({
        analysisRequestId: expect.any(String),
        name: "Chicken and rice",
        quickDescription: "Chicken and rice with cucumber",
        retries: 0,
      }),
    );
  });

  it("disables analyze when credits are not verified yet", () => {
    mockUseAiCreditsContext.mockReturnValue({
      credits: null,
      canAfford: mockCanAfford,
      refreshCredits: mockRefreshCredits,
      applyCreditsFromResponse: mockApplyCreditsFromResponse,
    });

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
        flow: { goTo: jest.fn() },
      }),
    );

    act(() => {
      result.current.onQuickDescriptionChange("Chicken and rice with cucumber");
    });

    expect(result.current.analysisState).toBe("credits_unverified");
    expect(result.current.analyzeDisabled).toBe(true);
  });

  it("disables analyze when current credits are already insufficient", () => {
    mockUseAiCreditsContext.mockReturnValue({
      credits: {
        userId: "user-1",
        tier: "free",
        balance: 0,
        allocation: 100,
        periodStartAt: "2026-03-01T00:00:00.000Z",
        periodEndAt: "2026-04-01T00:00:00.000Z",
        costs: { chat: 1, textMeal: 1, photo: 5 },
      },
      canAfford: mockCanAfford,
      refreshCredits: mockRefreshCredits,
      applyCreditsFromResponse: mockApplyCreditsFromResponse,
    });

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
        flow: { goTo: jest.fn() },
      }),
    );

    act(() => {
      result.current.onQuickDescriptionChange("Chicken and rice with cucumber");
    });

    expect(result.current.analysisState).toBe("insufficient_credits");
    expect(result.current.analyzeDisabled).toBe(true);
  });

  it("restores initial values and opens paywall from the limit modal", () => {
    const navigation = { navigate: jest.fn() };
    mockUseNavigation.mockReturnValue(navigation);

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
        flow: { goTo: jest.fn() },
        initialValues: {
          name: "Meal",
          quickDescription: "rice",
          retries: 2,
          showLimitModal: true,
          submitError: "submit-error",
        },
      }),
    );

    expect(result.current.name).toBe("Meal");
    expect(result.current.retries).toBe(2);
    expect(result.current.showLimitModal).toBe(true);
    expect(result.current.submitError).toBe("submit-error");

    act(() => {
      result.current.openPaywall();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("ManageSubscription");
  });

  it("reconciles credits before blocking analysis when local snapshot says no credits", async () => {
    const flow = { goTo: jest.fn() };
    mockCanAfford.mockReturnValue(false);
    mockPost.mockResolvedValue({
      userId: "user-1",
      tier: "free",
      balance: 74,
      allocation: 100,
      periodStartAt: "2026-03-01T00:00:00.000Z",
      periodEndAt: "2026-04-01T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
    });
    mockApplyCreditsFromResponse.mockImplementation((value: unknown) => value);
    mockRefreshCredits.mockResolvedValue({
      userId: "user-1",
      tier: "free",
      balance: 74,
      allocation: 100,
      periodStartAt: "2026-03-01T00:00:00.000Z",
      periodEndAt: "2026-04-01T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
    });

    const { result } = renderHook(() =>
      useMealTextAiState({
        t: (key: string) => key,
        language: "en",
        flow,
      }),
    );

    act(() => {
      result.current.onNameChange("Chicken and rice");
    });
    act(() => {
      result.current.onQuickDescriptionChange("Chicken and rice with cucumber");
    });
    await act(async () => {
      await result.current.onAnalyze();
    });

    expect(mockPost).toHaveBeenCalledWith("/ai/credits/sync-tier", undefined);
    expect(mockRefreshCredits).toHaveBeenCalled();
    expect(flow.goTo).toHaveBeenCalledWith(
      "TextAnalyzing",
      expect.objectContaining({
        analysisRequestId: expect.any(String),
        name: "Chicken and rice",
        quickDescription: "Chicken and rice with cucumber",
        retries: 0,
      }),
    );
    expect(result.current.showLimitModal).toBe(false);
  });
});
