import { describe, expect, it } from "@jest/globals";

import { getAiUxErrorType } from "@/services/ai/uxError";

describe("getAiUxErrorType", () => {
  it("prefers canonical backend detail.code for AI Chat v2", () => {
    expect(
      getAiUxErrorType({
        status: 503,
        details: {
          detail: {
            code: "AI_CHAT_CONTEXT_UNAVAILABLE",
            message: "Chat context is temporarily unavailable.",
          },
        },
      }),
    ).toBe("AI_CHAT_CONTEXT_UNAVAILABLE");
  });

  it("maps timeout-like service failures to AI_CHAT_TIMEOUT", () => {
    expect(
      getAiUxErrorType(
        Object.assign(new Error("AI service unavailable"), {
          code: "ai/unavailable",
          source: "ApiClient",
          retryable: true,
          cause: Object.assign(new Error("Timed out"), {
            code: "api/timeout",
            source: "ApiClient",
            retryable: true,
          }),
        }),
      ),
    ).toBe("AI_CHAT_TIMEOUT");
  });

  it("maps 500 fallback to AI_CHAT_INTERNAL_ERROR", () => {
    expect(getAiUxErrorType({ status: 500 })).toBe("AI_CHAT_INTERNAL_ERROR");
  });
});
