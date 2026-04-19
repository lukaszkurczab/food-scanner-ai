import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPost = jest.fn<
  (url: string, data?: unknown, options?: unknown) => Promise<unknown>
>();

jest.mock("uuid", () => {
  let counter = 0;
  return {
    v4: jest.fn(() => {
      counter += 1;
      return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
    }),
  };
});

jest.mock("@/services/core/apiClient", () => ({
  post: (url: string, data?: unknown, options?: unknown) =>
    mockPost(url, data, options),
}));

jest.mock("@/services/core/errorLogger", () => ({
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
      userId: "user-1",
      tier: "free",
      balance: 99,
      allocation: 100,
      periodStartAt: "2026-03-03T00:00:00.000Z",
      periodEndAt: "2026-04-03T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
      version: "test",
      persistence: "backend_owned",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/ai/textMealService");

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
    }, {
      retryMode: "idempotent",
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
    expect(result?.credits).toMatchObject({
      balance: 99,
      allocation: 100,
      costs: { chat: 1, textMeal: 1, photo: 5 },
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
      userId: "user-1",
      tier: "free",
      balance: 99,
      allocation: 100,
      periodStartAt: "2026-03-03T00:00:00.000Z",
      periodEndAt: "2026-04-03T00:00:00.000Z",
      costs: { chat: 1, textMeal: 1, photo: 5 },
      version: "test",
      persistence: "backend_owned",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/ai/textMealService");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logWarning } = require("@/services/core/errorLogger");

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

  it("maps 401 into auth/required service error", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/ai/textMealService");

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
    const { extractIngredientsFromText } = require("@/services/ai/textMealService");

    await expect(
      extractIngredientsFromText("user-1", { name: "burger" }, { lang: "en" }),
    ).rejects.toMatchObject({
      code: "ai/unavailable",
      source: "TextMealService",
      retryable: true,
    });
  });

  it("passes 402 through for credits refresh flow", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("payment required"), { status: 402 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { extractIngredientsFromText } = require("@/services/ai/textMealService");

    await expect(
      extractIngredientsFromText("user-1", { name: "burger" }, { lang: "en" }),
    ).rejects.toMatchObject({
      status: 402,
    });
  });
});
