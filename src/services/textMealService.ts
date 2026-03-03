import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { extractAndNormalizeIngredients } from "@/services/ai/ingredientParser";
import { post } from "@/services/apiClient";
import { withVersion } from "@/services/apiVersioning";
import { AiLimitExceededError } from "@/services/askDietAI";
import { logError, logWarning } from "@/services/errorLogger";

type AskResponse = {
  reply: string;
  usageCount?: number;
  remaining?: number;
  version?: string;
};

function unwrapIfWrapped(s: string): string {
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === "object" && typeof obj.description === "string") {
      return obj.description;
    }
    return s;
  } catch {
    return s;
  }
}

function buildBackendTextMealPrompt(payload: string, lang: string): string {
  return (
    `You are a nutrition assistant. The user language is ${lang}. ` +
    `Analyze the provided JSON payload describing a meal and return ONLY a raw JSON array. ` +
    `Each item must use this exact schema: {"name":"string","amount":123,"protein":0,"fat":0,"carbs":0,"kcal":0}. ` +
    `Amount must be in grams, numbers only, no prose, no markdown, no explanation. ` +
    `Treat a prepared dish as ONE item unless clearly separate foods are described. ` +
    `Convert household measures to grams/ml when possible. ` +
    `Names must be in the user's language from the payload. Payload: ${payload}`
  );
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

export async function extractIngredientsFromText(
  uid: string,
  description: string,
  opts?: { lang?: string },
): Promise<Ingredient[] | null> {
  if (!uid) return null;

  const lang = opts?.lang || "en";
  const userPayload = unwrapIfWrapped(description);

  try {
    const response = await post<AskResponse>(withVersion("/ai/ask"), {
      userId: uid,
      message: buildBackendTextMealPrompt(userPayload, lang),
      context: {
        actionType: "meal_text_analysis",
        lang,
      },
    });

    return (
      extractAndNormalizeIngredients(response.reply, {
        idFactory: () => uuidv4(),
      }) || null
    );
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
