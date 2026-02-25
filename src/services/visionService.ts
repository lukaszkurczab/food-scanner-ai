import NetInfo from "@react-native-community/netinfo";
import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpegAndResize } from "@/utils/convertToJpegAndResize";
import Constants from "expo-constants";
import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { consumeAiUseFor } from "./userService";
import { debugScope } from "@/utils/debug";
import { extractAndNormalizeIngredients } from "@/services/ai/ingredientParser";
import { parseOpenAiChatResponse } from "@/services/ai/openaiChat.dto";
import { createServiceError } from "@/services/contracts/serviceError";

const log = debugScope("Vision");

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const VISION_MODEL = "gpt-4o";
const MAX_TOKENS = 600;
const TIMEOUT_MS = 30000;
const RETRY_BACKOFF = 3000;
const AI_UNAVAILABLE_CODE = "ai/unavailable";

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    let s = String(v);
    s = s.replace(
      /(?<=\d)[\u00A0\u2000-\u200B\u202F\u205F\u3000\s](?=\d)/g,
      "."
    );
    s = s.replace(/,(?=\d)/g, ".");
    s = s.replace(
      /(?<=\d)[.\u00A0\u2000-\u200B\u202F\u205F\u3000](?=\d{3}\b)/g,
      ""
    );
    const n = Number(s.replace(/[^0-9.+-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

type VisionOpts = {
  isPremium?: boolean;
  limit?: number;
  lang?: string;
};

export async function detectIngredientsWithVision(
  userUid: string,
  imageUri: string,
  opts?: VisionOpts
): Promise<Ingredient[] | null> {
  const isPremium = !!opts?.isPremium;
  const limit = opts?.limit ?? 1;
  const USER_LANG = (opts?.lang || "pl").toLowerCase();

  if (!isPremium) {
    throw createServiceError({
      code: "ai/premium-required",
      source: "VisionService",
      retryable: false,
    });
  }

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    log.warn("blocked Vision call: offline");
    throw createServiceError({
      code: "offline",
      source: "VisionService",
      retryable: true,
    });
  }

  if (!OPENAI_API_KEY) {
    log.warn("missing OPENAI_API_KEY, skipping vision detection");
    return null;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const jpegUri = await convertToJpegAndResize(imageUri, 512, 512, {
        userUid,
        fileId: `vision-${Date.now()}`,
        dir: "tmp",
      });
      const imageBase64 = await uriToBase64(jpegUri);

      const payload = {
        model: VISION_MODEL,
        temperature: 0.1,
        top_p: 0,
        messages: [
          {
            role: "system",
            content:
              "You extract simplified nutrition data from images. Prioritize macro accuracy and simplicity. Decide granularity: if the image depicts a ready-made dish, return a single combined entry; do not decompose into sub-ingredients. If clearly multiple separate foods are present, return multiple entries. Prefer exact values from any visible nutrition facts table; otherwise estimate conservatively.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Language: ${USER_LANG}. Return names in ${USER_LANG}. Capitalize the first letter of each "name". Analyze the image and return ONLY a raw JSON array. No prose. Strict schema per item: {"name":"string","amount":123,"protein":0,"fat":0,"carbs":0,"kcal":0,"unit":"ml"}. The "unit" key is optional and used only for liquids; otherwise omit it. Use grams for "amount" by default. If a nutrition facts table is visible, read and convert per-serving data to grams if needed; otherwise infer from what is visible. Prefer one combined item for composite dishes (pizza, burger, kebab, lasagna, pierogi, salad, soup, curry, fish and chips, etc.). Do not split into dough/cheese/sauce or similar. If multiple distinct foods are clearly separate (e.g., an apple next to a sandwich and a bottle), list them separately. Numbers only. No text outside the JSON array. Output example: [{"name":"Owsianka","amount":120,"protein":6,"fat":4,"carbs":20,"kcal":148}]`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: MAX_TOKENS,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (response.status === 429 || response.status >= 500) {
        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        log.warn("Vision API temporary failure", { status: response.status });
        throw createServiceError({
          code: AI_UNAVAILABLE_CODE,
          source: "VisionService",
          retryable: true,
        });
      }

      const json = await response.json();
      const { content, hasError, errorCode } = parseOpenAiChatResponse(json);
      if (hasError) {
        if (
          attempt === 0 &&
          (errorCode === "rate_limit_exceeded" || response.status >= 500)
        ) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        log.warn("Vision API returned error payload", {
          status: response.status,
          errorCode,
        });
        return null;
      }

      if (!content) return null;

      const normalized = extractAndNormalizeIngredients(
        content,
        {
          idFactory: () => uuidv4(),
          toNumber,
          transformName: capFirst,
          allowMlUnit: true,
        },
        { allowRegexFallback: true }
      );
      if (!normalized) return null;

      await consumeAiUseFor(userUid, isPremium, "camera", limit);

      return normalized;
    } catch (error: unknown) {
      if (attempt === 0) {
        log.warn("Vision detection attempt failed, retrying", error);
        await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
        continue;
      }

      if (
        error instanceof Error &&
        (error.name === "AbortError" ||
          /network request failed|failed to fetch/i.test(error.message))
      ) {
        throw createServiceError({
          code: AI_UNAVAILABLE_CODE,
          source: "VisionService",
          retryable: true,
          cause: error,
        });
      }

      log.error("Vision detection failed", error);
      return null;
    }
  }

  return null;
}
