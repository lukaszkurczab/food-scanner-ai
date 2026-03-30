import { act, renderHook } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useMealTextAiState } from "@/feature/Meals/hooks/useMealTextAiState";

const mockUseNavigation = jest.fn();
const mockUseAiCreditsContext = jest.fn();
const mockCanAfford = jest.fn(() => true);

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockUseNavigation(),
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
    });
  });

  it("shows limit modal when user cannot afford text meal analysis", () => {
    const flow = { goTo: jest.fn() };
    mockCanAfford.mockReturnValue(false);

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
      result.current.onIngredientsChange("chicken, rice");
    });
    act(() => {
      result.current.onAnalyze();
    });

    expect(result.current.showLimitModal).toBe(true);
    expect(flow.goTo).not.toHaveBeenCalled();
  });

  it("routes valid text input to the analyzing step", () => {
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
      result.current.onIngredientsChange("chicken, rice");
    });
    act(() => {
      result.current.onAmountChange("250");
    });
    act(() => {
      result.current.onDescChange("extra tahini");
    });
    act(() => {
      result.current.onAnalyze();
    });

    expect(flow.goTo).toHaveBeenCalledWith("TextAnalyzing", {
      name: "Chicken and rice",
      ingPreview: "chicken, rice",
      amount: "250",
      desc: "extra tahini",
      retries: 0,
    });
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
          ingPreview: "rice",
          amount: "120",
          desc: "notes",
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
});
