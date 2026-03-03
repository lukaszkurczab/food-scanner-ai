import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
class MockAiLimitExceededError extends Error {
  readonly code = "ai/limit-exceeded";

  constructor(message = "AI usage limit exceeded") {
    super(message);
    this.name = "AiLimitExceededError";
  }
}

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        openaiApiKey: "test-key",
      },
    },
  },
}));

jest.mock("@/services/apiClient", () => ({
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/services/userService", () => ({
  canUseAiTodayFor: jest.fn(),
  consumeAiUseFor: jest.fn(),
}));

jest.mock("@/services/askDietAI", () => ({
  AiLimitExceededError: MockAiLimitExceededError,
}));

jest.mock("@/services/errorLogger", () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe("textMealService backend mode", () => {
  const originalBackendFlag = process.env["EXPO_PUBLIC_USE_NEW_AI_BACKEND"];

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env["EXPO_PUBLIC_USE_NEW_AI_BACKEND"] = "true";
  });

  afterEach(() => {
    if (originalBackendFlag === undefined) {
      delete process.env["EXPO_PUBLIC_USE_NEW_AI_BACKEND"];
    } else {
      process.env["EXPO_PUBLIC_USE_NEW_AI_BACKEND"] = originalBackendFlag;
    }
  });

  it("uses backend ai/ask and normalizes returned ingredients", async () => {
    mockPost.mockResolvedValueOnce({
      reply:
        '[{"name":"Płatki owsiane","amount":40,"protein":5,"fat":3,"carbs":27,"kcal":150}]',
      usageCount: 1,
      remaining: 19,
      version: "test",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");

    const result = await extractIngredientsFromText(
      "user-1",
      JSON.stringify({
        name: "owsianka",
        ingredients: "płatki owsiane",
        amount_g: 40,
        notes: null,
        lang: "pl",
      }),
      { isPremium: false, limit: 1, lang: "pl" },
    );

    expect(mockPost).toHaveBeenCalledWith("/api/v1/ai/ask", {
      userId: "user-1",
      message: expect.stringContaining("return ONLY a raw JSON array"),
      context: {
        actionType: "meal_text_analysis",
        lang: "pl",
      },
    });
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({
      name: "Płatki owsiane",
      amount: 40,
      protein: 5,
      fat: 3,
      carbs: 27,
      kcal: 150,
    });
  });

  it("throws AiLimitExceededError when backend responds with 429", async () => {
    const limitError = Object.assign(new Error("limit"), { status: 429 });
    mockPost.mockRejectedValueOnce(limitError);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");
    await expect(
      extractIngredientsFromText("user-1", '{"name":"burger"}', {
        isPremium: false,
        limit: 1,
        lang: "en",
      }),
    ).rejects.toBeInstanceOf(MockAiLimitExceededError);
  });
});
