import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  getAiDailyLimit,
  type AiTextMealAnalyzeResponse,
  type AiTextMealPayload,
} from "@/services/ai/contracts";
import { post } from "@/services/apiClient";
import { AiLimitExceededError } from "@/services/askDietAI";
import { toAiContractError } from "@/services/ai/errorMapping";
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

function hasNonZeroNutrition(ingredient: Ingredient): boolean {
  return (
    Number(ingredient.kcal) > 0 ||
    Number(ingredient.protein) > 0 ||
    Number(ingredient.fat) > 0 ||
    Number(ingredient.carbs) > 0
  );
}

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

    const mappedIngredients = response.ingredients.map(
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
    );

    if (!mappedIngredients.some(hasNonZeroNutrition)) {
      logWarning(
        "[textMealService] backend returned ingredients without nutrition values",
        { userUid: uid, lang },
      );
      return null;
    }

    return {
      ingredients: mappedIngredients,
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

    const contractError = toAiContractError(error, "TextMealService");
    if (contractError) {
      throw contractError;
    }

    return null;
  }
}
