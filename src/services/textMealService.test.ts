import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
class MockAiLimitExceededError extends Error {
  readonly code = "ai/limit-exceeded";
  readonly usage?: unknown;

  constructor(message = "AI usage limit exceeded", usage?: unknown) {
    super(message);
    this.name = "AiLimitExceededError";
    this.usage = usage;
  }
}

jest.mock("@/services/apiClient", () => ({
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/services/askDietAI", () => ({
  AiLimitExceededError: MockAiLimitExceededError,
}));

jest.mock("@/services/errorLogger", () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe("textMealService", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  it("uses backend text meal endpoint and maps returned ingredients", async () => {
    mockPost.mockResolvedValueOnce({
      ingredients: [
        {
          name: "Płatki owsiane",
          amount: 40,
          protein: 5,
          fat: 3,
          carbs: 27,
          kcal: 150,
        },
      ],
      usageCount: 1,
      dailyLimit: 20,
      remaining: 19,
      dateKey: "2026-03-03",
      version: "test",
      persistence: "backend_owned",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");

    const result = await extractIngredientsFromText(
      "user-1",
      {
        name: "owsianka",
        ingredients: "płatki owsiane",
        amount_g: 40,
        notes: null,
      },
      { lang: "pl" },
    );

    expect(mockPost).toHaveBeenCalledWith("/ai/text-meal/analyze", {
      payload: {
        name: "owsianka",
        ingredients: "płatki owsiane",
        amount_g: 40,
        notes: null,
      },
      lang: "pl",
    });
    expect(result?.ingredients).toHaveLength(1);
    expect(result?.ingredients[0]).toMatchObject({
      id: expect.any(String),
      name: "Płatki owsiane",
      amount: 40,
      unit: "g",
      protein: 5,
      fat: 3,
      carbs: 27,
      kcal: 150,
    });
    expect(result?.usage).toEqual({
      usageCount: 1,
      dailyLimit: 20,
      remaining: 19,
    });
  });

  it("returns null when backend responds with zero nutrition values", async () => {
    mockPost.mockResolvedValueOnce({
      ingredients: [
        {
          name: "Kebab",
          amount: 350,
          protein: 0,
          fat: 0,
          carbs: 0,
          kcal: 0,
        },
      ],
      usageCount: 1,
      dailyLimit: 20,
      remaining: 19,
      dateKey: "2026-03-03",
      version: "test",
      persistence: "backend_owned",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logWarning } = require("@/services/errorLogger");

    const result = await extractIngredientsFromText(
      "user-1",
      {
        name: "kebab",
        ingredients: "kebab",
        amount_g: 350,
        notes: null,
      },
      { lang: "pl" },
    );

    expect(result).toBeNull();
    expect(logWarning).toHaveBeenCalledWith(
      "[textMealService] backend returned ingredients without nutrition values",
      { userUid: "user-1", lang: "pl" },
    );
  });

  it("throws AiLimitExceededError when backend responds with 429", async () => {
    const limitError = Object.assign(new Error("limit"), { status: 429 });
    mockPost.mockRejectedValueOnce(limitError);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");
    await expect(
      extractIngredientsFromText("user-1", { name: "burger" }, { lang: "en" }),
    ).rejects.toBeInstanceOf(MockAiLimitExceededError);
  });

  it("passes backend usage snapshot into AiLimitExceededError", async () => {
    mockPost.mockRejectedValueOnce(
      Object.assign(new Error("limit"), {
        status: 429,
        details: {
          detail: {
            usage: {
              dateKey: "2026-03-03",
              usageCount: 20,
              dailyLimit: 20,
              remaining: 0,
            },
          },
        },
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");
    await expect(
      extractIngredientsFromText("user-1", { name: "burger" }, { lang: "en" }),
    ).rejects.toMatchObject({
      usage: {
        dateKey: "2026-03-03",
        usageCount: 20,
        dailyLimit: 20,
        remaining: 0,
      },
    });
  });

  it("maps 401 into auth/required service error", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");

    await expect(
      extractIngredientsFromText("user-1", { name: "burger" }, { lang: "en" }),
    ).rejects.toMatchObject({
      code: "auth/required",
      source: "TextMealService",
      retryable: false,
    });
  });

  it("maps 503 into ai/unavailable service error", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("unavailable"), { status: 503 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/textMealService");

    await expect(
      extractIngredientsFromText("user-1", { name: "burger" }, { lang: "en" }),
    ).rejects.toMatchObject({
      code: "ai/unavailable",
      source: "TextMealService",
      retryable: true,
    });
  });
});
