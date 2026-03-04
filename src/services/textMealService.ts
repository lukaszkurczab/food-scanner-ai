import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  getAiDailyLimit,
  type AiTextMealAnalyzeResponse,
  type AiTextMealPayload,
} from "@/services/ai/contracts";
import { post } from "@/services/apiClient";
import { AiLimitExceededError } from "@/services/askDietAI";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { logError, logWarning } from "@/services/errorLogger";

export type TextMealAnalyzeResult = {
  ingredients: Ingredient[];
  usage: {
    usageCount: number;
    dailyLimit: number;
    remaining: number;
  };
};

export async function extractIngredientsFromText(
  uid: string,
  payload: AiTextMealPayload,
  opts?: { lang?: string },
): Promise<TextMealAnalyzeResult | null> {
  if (!uid) return null;

  const lang = opts?.lang || "en";

  try {
    const response = await post<AiTextMealAnalyzeResponse>("/ai/text-meal/analyze", {
      payload,
      lang,
    });

    return {
      ingredients: response.ingredients.map(
        (ingredient): Ingredient => ({
          id: uuidv4(),
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit ?? "g",
          protein: ingredient.protein,
          fat: ingredient.fat,
          carbs: ingredient.carbs,
          kcal: ingredient.kcal,
        }),
      ),
      usage: {
        usageCount: response.usageCount,
        dailyLimit: getAiDailyLimit(response),
        remaining: response.remaining,
      },
    };
  } catch (error) {
    if (getErrorStatus(error) === 429) {
      logWarning(
        "[textMealService] backend text analysis limit reached",
        { userUid: uid, lang },
        error,
      );
      throw new AiLimitExceededError();
    }

    logError(
      "[textMealService] backend text analysis failed",
      { userUid: uid, lang },
      error,
    );
    return null;
  }
}
