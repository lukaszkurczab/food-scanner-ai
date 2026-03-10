import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();
const mockLogError = jest.fn();
const mockLogWarning = jest.fn();
const mockIsE2EModeEnabled = jest.fn<() => boolean>();
const mockGetE2EMockChatReply = jest.fn<() => string>();

jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    language: "en",
  },
}));

jest.mock("@/services/apiClient", () => ({
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

jest.mock("@/services/e2e/config", () => ({
  isE2EModeEnabled: () => mockIsE2EModeEnabled(),
  getE2EMockChatReply: () => mockGetE2EMockChatReply(),
}));

jest.mock("@/services/errorLogger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
  logWarning: (...args: unknown[]) => mockLogWarning(...args),
}));

describe("askDietAI", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockIsE2EModeEnabled.mockReturnValue(false);
    mockGetE2EMockChatReply.mockReturnValue("e2e-reply");
  });

  it("uses backend ai/ask only and forwards raw chat context", async () => {
    mockPost.mockResolvedValueOnce({
      reply: "Backend reply",
      usageCount: 3,
      remaining: 17,
      dateKey: "2026-03-03",
      version: "test",
      persistence: "backend_owned",
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { askDietAI } = require("@/services/askDietAI");

    const result = await askDietAI(
      "What should I eat tonight?",
      [
        {
          userUid: "user-1",
          mealId: "meal-1",
          timestamp: "2026-03-03T10:00:00.000Z",
          type: "dinner",
          name: "Pasta",
          ingredients: [],
          createdAt: "2026-03-03T10:00:00.000Z",
          updatedAt: "2026-03-03T10:00:00.000Z",
          syncState: "synced",
          source: "manual",
        },
      ],
      [{ from: "user", text: "I want something light" }],
      {
        unitsSystem: "metric",
        age: "31",
        sex: "male",
        height: "180",
        weight: "82",
        preferences: ["highProtein"],
        activityLevel: "moderate",
        goal: "maintain",
        surveyComplited: true,
        calorieTarget: 2200,
      },
      { uid: "user-1", isPremium: false },
    );

    expect(mockPost).toHaveBeenCalledWith("/ai/ask", {
      message: "What should I eat tonight?",
      context: expect.objectContaining({
        actionType: "chat",
        language: "en",
        meals: [
          expect.objectContaining({
            mealId: "meal-1",
            name: "Pasta",
          }),
        ],
        profile: expect.objectContaining({
          preferences: ["highProtein"],
          calorieTarget: 2200,
        }),
        history: [{ from: "user", text: "I want something light" }],
      }),
    });
    expect(result).toMatchObject({
      reply: "Backend reply",
      persistence: "backend_owned",
    });
  });

  it("throws AiLimitExceededError when backend returns 429", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("limit"), { status: 429 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { askDietAI, AiLimitExceededError } = require("@/services/askDietAI");

    await expect(
      askDietAI("Question", [], [], {
        unitsSystem: "metric",
        age: "",
        sex: null,
        height: "",
        weight: "",
        preferences: [],
        activityLevel: "moderate",
        goal: "maintain",
        surveyComplited: false,
      }, { uid: "user-1" }),
    ).rejects.toBeInstanceOf(AiLimitExceededError);

    expect(mockLogWarning).toHaveBeenCalled();
  });

  it("maps 401 into auth/required service error", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { askDietAI } = require("@/services/askDietAI");

    await expect(
      askDietAI(
        "Question",
        [],
        [],
        {
          unitsSystem: "metric",
          age: "",
          sex: null,
          height: "",
          weight: "",
          preferences: [],
          activityLevel: "moderate",
          goal: "maintain",
          surveyComplited: false,
        },
        { uid: "user-1" },
      ),
    ).rejects.toMatchObject({
      code: "auth/required",
      source: "AskDietAI",
      retryable: false,
    });
  });

  it("maps 503 into ai/unavailable service error", async () => {
    mockPost.mockRejectedValueOnce(Object.assign(new Error("unavailable"), { status: 503 }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { askDietAI } = require("@/services/askDietAI");

    await expect(
      askDietAI(
        "Question",
        [],
        [],
        {
          unitsSystem: "metric",
          age: "",
          sex: null,
          height: "",
          weight: "",
          preferences: [],
          activityLevel: "moderate",
          goal: "maintain",
          surveyComplited: false,
        },
        { uid: "user-1" },
      ),
    ).rejects.toMatchObject({
      code: "ai/unavailable",
      source: "AskDietAI",
      retryable: true,
    });
  });

  it("returns deterministic e2e reply without calling backend", async () => {
    mockIsE2EModeEnabled.mockReturnValue(true);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { askDietAI } = require("@/services/askDietAI");

    const result = await askDietAI(
      "Question",
      [],
      [],
      {
        unitsSystem: "metric",
        age: "",
        sex: null,
        height: "",
        weight: "",
        preferences: [],
        activityLevel: "moderate",
        goal: "maintain",
        surveyComplited: false,
      },
      { uid: "user-1" },
    );

    expect(mockPost).not.toHaveBeenCalled();
    expect(result).toEqual({
      reply: "e2e-reply",
      version: "e2e",
      persistence: "backend_owned",
    });
  });
});
