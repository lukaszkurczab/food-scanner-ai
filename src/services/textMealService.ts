import Constants from "expo-constants";
import type { Ingredient } from "@/types";
import { canUseAiTodayFor, consumeAiUseFor } from "@/services/userService";
import { v4 as uuidv4 } from "uuid";
import { extractAndNormalizeIngredients } from "@/services/ai/ingredientParser";
import { parseOpenAiChatResponse } from "@/services/ai/openaiChat.dto";
import { debugScope } from "@/utils/debug";
import { post } from "@/services/apiClient";
import { withVersion } from "@/services/apiVersioning";
import { AiLimitExceededError } from "@/services/askDietAI";
import { logError, logWarning } from "@/services/errorLogger";
import { readPublicEnv } from "@/services/publicEnv";

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const TIMEOUT_MS = 30000;
const log = debugScope("TextMealService");

type AskResponse = {
  reply: string;
  usageCount?: number;
  remaining?: number;
  version?: string;
};

function unwrapIfWrapped(s: string): string {
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === "object" && typeof obj.description === "string")
      return obj.description;
    return s;
  } catch {
    return s;
  }
}

function isNewAiBackendEnabled(): boolean {
  return readPublicEnv("EXPO_PUBLIC_USE_NEW_AI_BACKEND") === "true";
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
  _uid: string,
  description: string,
  opts?: { isPremium?: boolean; limit?: number; lang?: string }
): Promise<Ingredient[] | null> {
  const isPremium = !!opts?.isPremium;
  const limit = opts?.limit ?? 1;
  const lang = opts?.lang || "en";
  const userPayload = unwrapIfWrapped(description);

  if (isNewAiBackendEnabled()) {
    if (!_uid) return null;

    try {
      const response = await post<AskResponse>(withVersion("/ai/ask"), {
        userId: _uid,
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
          { userUid: _uid, isPremium, limit, lang },
          error,
        );
        throw new AiLimitExceededError();
      }

      logError(
        "[textMealService] backend text analysis failed",
        { userUid: _uid, isPremium, limit, lang },
        error,
      );
      return null;
    }
  }

  if (!isPremium && _uid) {
    const allowed = await canUseAiTodayFor(_uid, isPremium, "text", limit);
    if (!allowed) return null;
  }

  if (!OPENAI_API_KEY) {
    log.warn("missing OPENAI_API_KEY, skipping text extraction");
    return null;
  }

  log.log("extracting ingredients from text");

  const systemPrompt =
    `You are a nutrition assistant. Analyze a JSON payload describing a meal.\n` +
    `Decide granularity: treat a prepared dish as ONE item; list multiple items only when clearly separate.\n` +
    `Convert household measures to grams/ml when present (teaspoon≈5g, tablespoon≈15g, cup≈240ml, slice bread≈30g, handful nuts≈30g, medium fruit≈150g).\n` +
    `Return ONLY a JSON array. Each item: {"name":"string","amount":123,"protein":0,"fat":0,"carbs":0,"kcal":0}.\n` +
    `Amount in grams (ml only for liquids). Numbers only. No prose.\n` +
    `The "name" must be in the user's language from the payload. Keep keys in English.\n` +
    `Example 1 (PL): Input {"name":"owsianka","ingredients":"pół szklanki płatków, szklanka mleka 2%, garść jagód, łyżeczka miodu","amount_g":null,"notes":null,"lang":"pl"} -> ` +
    `[{"name":"płatki owsiane","amount":40,"protein":5,"fat":3,"carbs":27,"kcal":150},{"name":"mleko 2%","amount":240,"protein":8,"fat":5,"carbs":12,"kcal":120},{"name":"jagody","amount":50,"protein":0,"fat":0,"carbs":8,"kcal":30},{"name":"miód","amount":7,"protein":0,"fat":0,"carbs":6,"kcal":20}]\n` +
    `Example 2 (EN): Input {"name":"burger","ingredients":"cheeseburger with fries","amount_g":null,"notes":null,"lang":"en"} -> ` +
    `[{"name":"cheeseburger with fries","amount":350,"protein":20,"fat":22,"carbs":35,"kcal":450}]`;

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0,
    top_p: 0,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
  } as const;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      log.warn("OpenAI chat completion failed", { status: resp.status });
      return null;
    }
    const json = await resp.json();
    const { content } = parseOpenAiChatResponse(json);
    if (!content) return null;
    const normalized = extractAndNormalizeIngredients(content, {
      idFactory: () => uuidv4(),
    });
    if (!normalized) return null;
    if (!isPremium && _uid)
      await consumeAiUseFor(_uid, isPremium, "text", limit);
    return normalized;
  } catch (error: unknown) {
    clearTimeout(timeout);
    log.warn("text extraction request failed", error);
    return null;
  }
}
