import i18next from "i18next";
import { post } from "./apiClient";
import type { Meal, FormData } from "@/types";
import {
  getE2EMockChatReply,
  isE2EModeEnabled,
} from "@/services/e2e/config";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { logError, logWarning } from "@/services/errorLogger";
import type {
  AiAskBackendResponse,
  AiAskE2EResponse,
  AiAskResponse,
} from "@/services/ai/contracts";

export type Message = { from: "user" | "ai"; text: string };

export type AskDietAIResponse = AiAskResponse;

export class AiLimitExceededError extends Error {
  readonly code = "ai/limit-exceeded";

  constructor(message = "AI usage limit exceeded") {
    super(message);
    this.name = "AiLimitExceededError";
  }
}

function buildAskDietAIContext(
  meals: Meal[],
  chatHistory: Message[],
  profile: FormData
) {
  const lang = i18next.language || "en";

  return {
    meals: meals.slice(0, 5),
    profile,
    history: chatHistory.slice(-2).map((message) => ({
      from: message.from,
      text: message.text,
    })),
    language: lang,
    actionType: "chat",
  };
}

function buildAskDietAILogContext(params: {
  uid?: string;
  question: string;
  meals: Meal[];
  chatHistory: Message[];
  isPremium?: boolean;
}) {
  return {
    uid: params.uid,
    isPremium: !!params.isPremium,
    questionLength: params.question.trim().length,
    mealsCount: params.meals.length,
    historyCount: params.chatHistory.length,
  };
}

export async function askDietAI(
  question: string,
  meals: Meal[],
  chatHistory: Message[],
  profile: FormData,
  opts?: { uid?: string; isPremium?: boolean; limit?: number }
): Promise<AskDietAIResponse> {
  if (isE2EModeEnabled()) {
    const e2eResponse: AiAskE2EResponse = {
      reply: getE2EMockChatReply(),
      version: "e2e",
      persistence: "backend_owned",
    };
    return e2eResponse;
  }

  const uid = opts?.uid?.trim();

  try {
    return await post<AiAskBackendResponse>("/ai/ask", {
      message: question,
      context: buildAskDietAIContext(meals, chatHistory, profile),
    });
  } catch (error) {
    if (getErrorStatus(error) === 429) {
      logWarning(
        "[askDietAI] backend AI usage limit reached",
        buildAskDietAILogContext({
          uid,
          question,
          meals,
          chatHistory,
          isPremium: opts?.isPremium,
        }),
        error,
      );
      throw new AiLimitExceededError();
    }

    logError(
      "[askDietAI] backend AI request failed",
      buildAskDietAILogContext({
        uid,
        question,
        meals,
        chatHistory,
        isPremium: opts?.isPremium,
      }),
      error,
    );
    throw error;
  }
}
